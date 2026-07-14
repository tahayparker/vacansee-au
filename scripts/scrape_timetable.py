"""
UOW Timetable Web Viewer (Scientia SWS) - full location scrape.

Iterates every campus the site itself lists (physical AND non-physical,
e.g. "On Campus Subject Delivered Online" - discovered at runtime from the
site's own dlFilter dropdown rather than a hardcoded GUID map, so no
campus is ever silently excluded), then every room in that campus. Runs
NUM_WORKERS threads concurrently, each with its OWN independent session
(own login/viewstate chain) rather than sharing one - ASP.NET WebForms
apps commonly lock session state per cookie, so concurrent requests on a
single shared session would just serialize server-side (or start erroring
under load) instead of actually speeding anything up.

Retry philosophy, three tiers in order:
1. Fast requeue retry (--max-all-weeks-attempts attempts): a room that
   gets an error page is NOT retried with a sleep. It goes back to the
   END of the shared work queue instead, so other rooms get processed
   while it waits its turn again - real minutes pass "for free" using
   time productively.
2. Real exponential backoff, still on the all-weeks request
   (--max-all-weeks-backoff-attempts attempts, doubling up to a cap):
   once the fast retries are exhausted, this blocks the thread with
   actual sleeps and keeps asking for the whole year in one request -
   succeeding here avoids the much slower per-week grind entirely.
3. Per-week fallback: only if the all-weeks request is STILL erroring
   after that does it drop to requesting one week at a time, which itself
   has its own linear-pass-then-backoff retry for individual stuck weeks
   (weeks that fail tend to be the same ones across many rooms, so that's
   a persistent server-side issue rather than per-request noise).

Safe to Ctrl-C and rerun: already-scraped (campus, room) pairs are skipped
via a checkpoint file.

Normalization follows the conventions in vacansee-au/scripts/scrape_timetable.py:
  - fold & / &amp; into ; before splitting a multi-room Location field
  - "300-UG-03" -> "300-UG03" (second hyphen dropped)
  - "LP_400-101" -> "400-101"
  - "to be advised" -> "0-00"
  - online variants ("Class Online", "College Online", "Refer to
    Moodle", etc.) -> "Online"
  - bare "Foyer" with no building number -> "29-Foyer" (the only foyer
    that shows up without one, always building 29 in practice)
  - "<building>-FOYER" (any case) -> "<building>-Foyer"

Room-merge splitting: a Location like "390-235 & 390-236" or
"29-G04 & Foyer" is unconditionally split on "&"/";" into its individual
rooms - every fragment becomes its own occupied room, full stop. A
combined/merged room string is never kept as a row in its own right;
checking each fragment against a "known room list" first (an earlier
version of this script did that) turned out to be the wrong call, since
a campus's own room list doesn't necessarily include every physical room
that shows up in its bookings (e.g. a UOW College Wollongong booking can
legitimately list a room that's only in the main Wollongong campus's room
list) - splitting unconditionally sidesteps that mismatch entirely.

Every text value pulled from the HTML (Name/Description/Location/etc.)
is whitespace-collapsed (internal newlines/tabs/runs of spaces -> single
space) before it ever reaches the CSV. This is what was producing the
"spillover" - a cell's literal embedded newline was previously preserved
into the CSV field, which is valid CSV (RFC 4126 allows quoted newlines)
but reads as extra broken lines in a plain-text/spreadsheet view. With
whitespace collapsed at parse time, no field can ever contain a raw
newline, so the CSV is guaranteed one physical line per record.

Output (both written once, sorted, at the end of a full run - not
during the run, since rows arrive out of order across worker threads
and get appended/checkpointed incrementally):
  public/raw/raw_classes.csv - the raw scrape, one row per
    (campus, room, occurrence date), columns: Campus, RoomQueried,
    RoomLabel, Name, Day, Start, Finish, Duration, Date,
    ScheduledDatesRaw, Location, Description
  public/classes.csv - same schema as vacansee-au's classes.csv
    (SubCode, Class, Day, StartTime, EndTime, Room, Date, Campus), derived
    from the raw rows. SubCode/Class are split out of the raw "Name"
    field with a best-effort regex (WRB doesn't give these as separate
    fields the way SOLSS does) - see derive_subcode_class(); this is the
    one part of the mapping that should be checked against a real scrape,
    since it was written without a live sample of a normal (non-ad-hoc)
    booking's Name format.

Both CSVs are sorted the same way vacansee-au/scripts/scrape_timetable.py
sorts classes.csv: by campus order first (here, the order the site's own
dropdown lists campuses in, captured at discovery time, since there's no
fixed hardcoded campus map anymore), then room order (the order the
site's own room dropdown lists rooms in for that campus; a room not in
that list, e.g. a dropped-merge combo, falls back to a natural
alphanumeric sort), then day-of-week, start time, date, and name/subcode
as final tiebreakers.

All progress and warnings go through the `logging` module - console
output plus a persistent log file. Rows with an unparseable Scheduled
Dates value still get written (Date left blank) rather than dropped;
each occurrence is logged as a WARNING with room/campus context so you
can grep the log afterward instead of losing the row silently.
"""

import argparse
import csv
import json
import logging
import logging.handlers
import queue
import re
import threading
import time
from collections import OrderedDict
from datetime import datetime, timedelta
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup

logger = logging.getLogger("uow_wrb_scraper")

BASE = "https://wrb.uow.edu.au/Timetable2026/"
HEADERS = {"User-Agent": "Mozilla/5.0"}

RAW_FIELDNAMES = [
    "Campus",
    "RoomQueried",
    "RoomLabel",
    "Name",
    "Day",
    "Start",
    "Finish",
    "Duration",
    "Date",
    "ScheduledDatesRaw",
    "Location",
    "Description",
]

CLASSES_FIELDNAMES = [
    "SubCode",
    "Class",
    "Day",
    "StartTime",
    "EndTime",
    "Room",
    "Date",
    "Campus",
    "Description",
]

DAY_ORDER = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}

DAY_NORMALIZATION = {
    "mon": "Monday",
    "monday": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "wed": "Wednesday",
    "weds": "Wednesday",
    "wednesday": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
    "sun": "Sunday",
    "sunday": "Sunday",
}

# Campus names that overlap with vacansee-au's SOLSS-sourced campus names
# (scripts/scrape_timetable.py CAMPUSES dict) get remapped to match, so the
# same physical campus reads identically across both data sources. Any
# campus WRB lists that ISN'T in this map (including online/non-UOW
# categories, which have no SOLSS equivalent at all) just gets its
# trailing " Campus" suffix stripped, if present, and is otherwise left
# exactly as WRB names it - it's simply not excluded.
CAMPUS_NAME_MAP = {
    "Wollongong Campus": "Wollongong",
    "UOW Eurobodalla Campus": "Eurobodalla",
    "Bega Valley Campus": "Bega Valley",
    "Innovation Campus": "Innovation Campus",  # SOLSS keeps this one's "Campus" suffix
    "Shoalhaven Campus": "Shoalhaven",
    "Southern Highlands Campus": "Southern Highlands",
    "Sydney CBD Campus": "Sydney",
    "UOW Liverpool": "Liverpool",
    "UOW Sutherland": "Sutherland",
}

TBA_ROOM = "0-00"
_AMP_RE = re.compile(r"&amp;?|&", re.IGNORECASE)
_ROOM_CODE_RE = re.compile(r"^(\d+)-([A-Za-z]+)-(\w+)$")
_LP_PREFIX_RE = re.compile(r"^LP_400-")
_ONLINE_VARIANTS = {
    "class online",
    "lecture online",
    "online",
    "online optional room available",
    "college online",
    "refer to moodle",
}
_FOYER_WITH_BUILDING_RE = re.compile(r"^(\d+[A-Za-z]*)-FOYER$", re.IGNORECASE)
_WS_COLLAPSE_RE = re.compile(r"\s+")
_TRAILING_CAMPUS_RE = re.compile(r"\s*Campus$", re.IGNORECASE)

# Sort priority for classes.csv/raw_classes.csv, per explicit instruction -
# NOT the site's own dropdown order.
CAMPUS_SORT_ORDER = [
    "Wollongong",
    "UOW College",
    "Innovation Campus",
    "Shoalhaven",
    "Bega Valley",
    "Eurobodalla",
    "Southern Highland",
    "Sutherland",
    "Sydney CBD",
    "Liverpool",
    "Online",
]

# Keyword match rules, checked in THIS order (distinct from the sort order
# above) so specific/ambiguous keywords get checked before generic ones -
# e.g. "UOW College Wollongong" must match "college" before it can match
# the generic "wollongong" keyword. Every campus WRB lists is matched
# against these; any campus that matches none of them (online delivery,
# pre-recorded, non-UOW campus, or anything not yet seen) collapses into
# a single "Online" bucket - both for sort position AND for the Campus
# value written into classes.csv (raw_classes.csv keeps the original WRB
# name untouched, since that's the raw scrape of source truth).
CAMPUS_MATCH_RULES = [
    ("UOW College", ("college",)),
    ("Online", ("online", "non uow", "non-uow", "pre recorded", "pre-recorded")),
    ("Innovation Campus", ("innovation",)),
    ("Shoalhaven", ("shoalhaven",)),
    ("Bega Valley", ("bega",)),
    ("Eurobodalla", ("eurobodalla",)),
    ("Southern Highland", ("southern highland",)),
    ("Sutherland", ("sutherland",)),
    ("Sydney CBD", ("sydney",)),
    ("Liverpool", ("liverpool",)),
    ("Wollongong", ("wollongong",)),
]


def campus_bucket(campus_name):
    """(bucket_label, sort_index) for a raw WRB campus name. sort_index
    reflects the explicit priority list (CAMPUS_SORT_ORDER); the label is
    found via CAMPUS_MATCH_RULES, which is ordered separately to avoid
    ambiguous-keyword false matches (see comment above). Anything matching
    none of the named buckets - online delivery, pre-recorded activity,
    non-UOW campus, or any future/unknown campus - falls into "Online" at
    the end, per instruction to merge all such categories together."""
    n = (campus_name or "").lower()
    for label, keywords in CAMPUS_MATCH_RULES:
        if any(kw in n for kw in keywords):
            return label, CAMPUS_SORT_ORDER.index(label)
    return "Online", CAMPUS_SORT_ORDER.index("Online")


# Best-effort UOW subject-code shape, e.g. "ACCY121", "BCM 110", "SNUG201",
# "MEDI991", "LLB1100". Used to validate the token between the Name
# field's first and second hyphen before trusting it as a SubCode.
_SUBJECT_CODE_RE = re.compile(r"^[A-Z]{2,6}\s?\d{2,4}[A-Z]{0,3}$")


def collapse_ws(text):
    """Collapse ANY run of whitespace (space/tab/newline/nbsp) to a single
    space and strip ends. Applied to every text value pulled out of the
    HTML so no field can ever carry a raw newline into the CSV."""
    if text is None:
        return ""
    text = text.replace("\xa0", " ")
    return _WS_COLLAPSE_RE.sub(" ", text).strip()


def natural_key(s):
    """Numeric-aware sort key so '17-102' sorts before '300-UG03' etc."""
    return [
        int(tok) if tok.isdigit() else tok.lower()
        for tok in re.split(r"(\d+)", s or "")
    ]


def normalize_day(raw):
    if not raw:
        return ""
    return DAY_NORMALIZATION.get(raw.strip().lower(), raw.strip())


def normalize_campus_for_classes(campus_name):
    mapped = CAMPUS_NAME_MAP.get(campus_name)
    if mapped:
        return mapped
    bucket_label, _ = campus_bucket(campus_name)
    if bucket_label == "Online":
        # Online delivery, pre-recorded activity, non-UOW campus, or any
        # other campus with no SOLSS equivalent - merge into one label.
        return "Online"
    return _TRAILING_CAMPUS_RE.sub("", campus_name).strip() or campus_name


def derive_subcode_class(name, description, class_type_lookup=None):
    """Split WRB's single 'Name' field into (SubCode, Class) for
    vacansee-au's classes.csv schema.

    SubCode: real timetabled subjects follow SESSION-SUBCODE-CAMPUS-MODE-
    CLASSTYPE/SEQ (e.g. "AUTM-ACCY121-BE-OC-T/01" -> subcode "ACCY121"),
    so the token between the first and second hyphen is checked against
    _SUBJECT_CODE_RE. If it doesn't look like a real subject code - which
    is expected for the many one-off/ad-hoc bookings WRB also lists (staff
    meetings, casual room bookings, exam sittings, etc: these aren't
    classes but are still real entries the site tracks) - the SubCode is
    just the whole raw Name, since there's no subject code to extract.

    Class: looked up by exact Name/Activity match against
    class_type_lookup (built from a separate scrape of the site's Subject
    Timetable report, which has an authoritative "Class Type" column e.g.
    "Lecture"/"Tutorial" - see scrape_class_type_lookup()). Falls back to
    the raw trailing class-type code from Name (e.g. "T", "CL") if no
    lookup hit, then to Description, since ad-hoc bookings have no
    Subject Timetable entry to look up.
    """
    name = (name or "").strip()
    parts = name.split("-")
    subcode = name
    cls = ""

    if len(parts) >= 2:
        candidate = parts[1].strip()
        if _SUBJECT_CODE_RE.match(candidate):
            subcode = candidate
            if class_type_lookup:
                cls = class_type_lookup.get(name, "")
            if not cls:
                tail = parts[-1].strip()
                cls = tail.split("/")[0].strip() if tail else ""
        else:
            # Ad-hoc/one-off booking (staff meeting, casual room booking,
            # exam sitting, etc): not a real subject code, so SubCode
            # stays the whole raw Name. For Class, the middle token (the
            # same position a real SubCode would occupy) is the
            # meaningful descriptor here - e.g. "LiverpoolExams2026" out
            # of "00CAS2-LiverpoolExams2026-Spring/03" - not whatever
            # trails after the last hyphen ("Spring"), which is often
            # just a session/seq marker with no descriptive value on its
            # own.
            cls = candidate.split("/")[0].strip()

    if not cls:
        cls = description or ""
    return subcode, cls


def new_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    # Cheap first line of defense against transient connection errors
    # (resets, timeouts at the socket level) - separate from and much
    # smaller than the app-level retry tiers, which handle the site
    # returning a valid-but-wrong "error page" response.
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[502, 503, 504],
        allowed_methods=frozenset(["GET", "POST"]),
    )
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


def get_form_state(html):
    soup = BeautifulSoup(html, "html.parser")

    def val(id_):
        tag = soup.find("input", {"id": id_})
        return tag["value"] if tag else ""

    return {
        "__VIEWSTATE": val("__VIEWSTATE"),
        "__VIEWSTATEGENERATOR": val("__VIEWSTATEGENERATOR"),
        "__EVENTVALIDATION": val("__EVENTVALIDATION"),
    }, soup


def postback(session, url, state, event_target, extra=None):
    data = {"__EVENTTARGET": event_target, "__EVENTARGUMENT": "", **state}
    if extra:
        data.update(extra)
    resp = session.post(url, data=data, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def postback_multi(session, url, state, event_target, pairs):
    data = [
        ("__EVENTTARGET", event_target),
        ("__EVENTARGUMENT", ""),
        ("__VIEWSTATE", state["__VIEWSTATE"]),
        ("__VIEWSTATEGENERATOR", state["__VIEWSTATEGENERATOR"]),
        ("__EVENTVALIDATION", state["__EVENTVALIDATION"]),
    ] + pairs
    resp = session.post(url, data=data, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def option_value_by_text(soup, select_id, text_contains):
    sel = soup.find("select", {"id": select_id})
    if not sel:
        return None
    for o in sel.find_all("option"):
        if text_contains.lower() in o.get_text(strip=True).lower():
            return o.get("value")
    return None


def first_option_value(soup, select_id, skip_empty=True):
    """Fallback for dlPeriod: the dropdown's broadest option is labelled
    "Teaching Day (08:30am - 8:30pm)" on the live site, not "All Day" -
    if neither literal text match hits, just take the first real option
    (the broadest span is always listed first)."""
    sel = soup.find("select", {"id": select_id})
    if not sel:
        return None
    for o in sel.find_all("option"):
        value = o.get("value")
        if skip_empty and not value:
            continue
        return value
    return None


def is_error_response(html):
    """True if the server returned the generic Cyon/ASP.NET error page
    instead of a real timetable report (e.g. 'Error processing page')."""
    return "Error processing page" in html or 'action="Error.aspx"' in html


# Dropdown placeholder labels to skip - NOT a campus exclusion list, just
# guards against picking up a "-- please select --" style first option.
_CAMPUS_PLACEHOLDER_LABELS = {"", "please select", "select...", "select"}


def discover_campuses(session):
    """Every campus the site's own dlFilter dropdown lists, in the site's
    own order - physical AND non-physical (online, non-UOW-campus,
    pre-recorded), so nothing is excluded by a stale hardcoded map."""
    r = session.get(BASE + "Default.aspx", headers=HEADERS, timeout=30)
    r.raise_for_status()
    state, _ = get_form_state(r.text)

    html2 = postback(session, BASE + "Default.aspx", state, "LinkBtn_locations")
    _, soup2 = get_form_state(html2)

    sel = soup2.find("select", {"id": "dlFilter"})
    campuses = OrderedDict()
    for o in sel.find_all("option"):
        guid = o.get("value")
        label = collapse_ws(o.get_text())
        if not guid or not label:
            continue
        if label.strip().lower() in _CAMPUS_PLACEHOLDER_LABELS:
            continue
        campuses[label] = guid
    return campuses


def load_campus_state(session, campus_guid):
    """Fresh session state + room list for one campus, using the given
    session. Each thread calls this itself the first time it touches a
    campus (and again if its state goes stale), rather than sharing one
    global session/state across threads."""
    r = session.get(BASE + "Default.aspx", headers=HEADERS, timeout=30)
    r.raise_for_status()
    state, _ = get_form_state(r.text)

    html2 = postback(session, BASE + "Default.aspx", state, "LinkBtn_locations")
    state2, _ = get_form_state(html2)

    extra = {"tLinkType": "locations", "tWildcard": "", "dlFilter": campus_guid}
    html3 = postback(session, BASE + "Default.aspx", state2, "dlFilter", extra)
    state3, soup3 = get_form_state(html3)

    rooms = [
        (o.get("value"), collapse_ws(o.get_text()))
        for o in soup3.find("select", {"id": "dlObject"}).find_all("option")
    ]

    days_all_week = option_value_by_text(
        soup3, "lbDays", "All Week"
    ) or first_option_value(soup3, "lbDays")
    period_all_day = (
        option_value_by_text(soup3, "dlPeriod", "All Day")
        or option_value_by_text(soup3, "dlPeriod", "Teaching Day")
        or first_option_value(soup3, "dlPeriod")
    )
    weeks_sel = soup3.find("select", {"id": "lbWeeks"})
    week_values = [
        o.get("value")
        for o in weeks_sel.find_all("option")
        if o.get("value") not in ("t", "n")
    ]
    week_labels = {
        o.get("value"): collapse_ws(o.get_text())
        for o in weeks_sel.find_all("option")
        if o.get("value") not in ("t", "n")
    }

    return {
        "state3": state3,
        "rooms": rooms,
        "known_rooms_set": {name for _, name in rooms},
        "room_order": {name: idx for idx, (_, name) in enumerate(rooms)},
        "days_all_week": days_all_week,
        "period_all_day": period_all_day,
        "week_values": week_values,
        "week_labels": week_labels,
    }


def _request_room_html(session, campus_guid, campus_ctx, room_value, week_values):
    """One postback for a room, requesting only the given week values."""
    pairs = [("tLinkType", "locations"), ("tWildcard", ""), ("dlFilter", campus_guid)]
    pairs += [("dlObject", room_value)]
    pairs += [("lbWeeks", w) for w in week_values]
    pairs += [("lbDays", campus_ctx["days_all_week"])]
    pairs += [("dlPeriod", campus_ctx["period_all_day"])]
    pairs += [("RadioType", "location_list;cyon_reports_list_url;dummy")]
    pairs += [("bGetTimetable", "View Timetable")]

    return postback_multi(
        session, BASE + "Default.aspx", campus_ctx["state3"], "bGetTimetable", pairs
    )


def cell_text(td):
    span = td.find("span", class_="csv")
    raw = span.get_text(" ", strip=True) if span else td.get_text(" ", strip=True)
    return collapse_ws(raw)


def parse_room_table(html):
    """Expect zero or one cyon_table for a single-room request."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", class_="cyon_table")
    if not tables:
        return "", []
    t = tables[0]
    label_tag = t.find_previous(["h1", "h2", "h3", "h4", "b", "strong", "span"])
    room_label = collapse_ws(label_tag.get_text(" ")) if label_tag else ""

    thead = t.find("thead")
    tbody = t.find("tbody")
    header_row = thead.find("tr") if thead else t.find("tr")
    if header_row is None:
        return room_label, []
    header = [collapse_ws(c.get_text(" ")) for c in header_row.find_all(["th", "td"])]

    body_rows = tbody.find_all("tr") if tbody else t.find_all("tr")[1:]

    out = []
    for r in body_rows:
        cells = r.find_all("td")
        if not cells:
            continue
        values = [cell_text(c) for c in cells]
        out.append(dict(zip(header, values)))
    return room_label, out


def convert_time_12h(raw):
    """'6:00am' / '2:00pm' / '12:00am' -> '06:00' / '14:00' / '00:00'."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    try:
        return datetime.strptime(raw, "%I:%M%p").strftime("%H:%M")
    except ValueError:
        return raw


_DASH_VARIANTS_RE = re.compile(r"[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]")
_DATE_TOKEN_RE = re.compile(
    r"^(\d{1,2}/\d{1,2}/\d{2,4})\s*-\s*(\d{1,2}/\d{1,2}/\d{2,4})$"
)
_SINGLE_DATE_RE = re.compile(r"^\d{1,2}/\d{1,2}/\d{2,4}$")


def _parse_ddmmyy(s):
    fmt = "%d/%m/%Y" if len(s.rsplit("/", 1)[-1]) == 4 else "%d/%m/%y"
    return datetime.strptime(s, fmt).date()


def resolve_scheduled_dates(raw, context=""):
    """
    'Scheduled Dates' column is already literal dates, not week numbers
    (unlike the SOLSS feed resolve_weeks.py works on), so no academic
    calendar lookup is needed here - just expand each segment into the
    actual dates it represents.

    Segment shapes seen in practice:
      - single date:            "15/12/25"
      - weekly range:           "27/01/26 - 24/02/26" (steps every 7 days)
      - multiple, joined by , or ;: "27/01/26 - 24/02/26, 14/04/26 - 28/04/26"

    The site's rendered dash between range endpoints isn't always a plain
    ASCII hyphen (en/em dash and non-breaking spaces show up), so those are
    normalized before matching. Bad/unparseable tokens are skipped rather
    than raised, so one odd entry doesn't kill the whole room's scrape -
    each skip is logged as a WARNING (with `context`, e.g.
    "Wollongong Campus/17-102") including the exact codepoints involved,
    so you can find and diagnose them afterward without re-running the
    whole scrape.
    """
    dates = set()
    original_raw = raw
    raw = collapse_ws(raw)
    if not raw:
        return []

    normalized = _DASH_VARIANTS_RE.sub("-", raw)

    for token in re.split(r"[;,]", normalized):
        token = token.strip()
        if not token:
            continue

        rng = _DATE_TOKEN_RE.match(token)
        if rng:
            try:
                start = _parse_ddmmyy(rng.group(1))
                end = _parse_ddmmyy(rng.group(2))
            except ValueError:
                logger.warning(
                    "[%s] unparseable date range token %r in %r (codepoints: %s)",
                    context,
                    token,
                    original_raw,
                    [hex(ord(c)) for c in token if not c.isascii()],
                )
                continue
            d = start
            while d <= end:
                dates.add(d)
                d += timedelta(days=7)
            continue

        if _SINGLE_DATE_RE.match(token):
            try:
                dates.add(_parse_ddmmyy(token))
            except ValueError:
                logger.warning(
                    "[%s] unparseable single-date token %r in %r (codepoints: %s)",
                    context,
                    token,
                    original_raw,
                    [hex(ord(c)) for c in token if not c.isascii()],
                )
            continue

        logger.warning(
            "[%s] unrecognized scheduled-date token shape %r in %r (codepoints: %s)",
            context,
            token,
            original_raw,
            [hex(ord(c)) for c in token if not c.isascii()],
        )

    return sorted(dates)


def clean_room_fragment(room):
    room = collapse_ws(room)
    online_key = room.rstrip(".").strip().lower()
    if online_key in _ONLINE_VARIANTS:
        return "Online"
    if room.strip().lower() == "foyer":
        # The one foyer fragment that shows up with no building number of
        # its own - per explicit instruction, this always means the
        # building 29 foyer, so it's special-cased rather than left as a
        # bare, building-less "Foyer" room.
        return "29-Foyer"
    m_foyer = _FOYER_WITH_BUILDING_RE.match(room.strip())
    if m_foyer:
        return f"{m_foyer.group(1)}-Foyer"
    room = _LP_PREFIX_RE.sub("400-", room)
    m = _ROOM_CODE_RE.fullmatch(room)
    if m:
        num, letters, rest = m.groups()
        room = f"{num}-{letters}{rest}"
    if room.strip().lower() == "to be advised":
        room = TBA_ROOM
    return room


def resolve_location_rooms(raw_location):
    """
    Split a Location string on '&'/';' into individual rooms and always
    occupy each one separately - a merged combo is never kept as its own
    row. A Location with no '&'/';' at all is just returned as one room.
    """
    raw = collapse_ws(raw_location)
    if not raw:
        return [""]

    folded = _AMP_RE.sub(";", raw)
    parts = [p.strip() for p in folded.split(";") if p.strip()]

    if not parts:
        return [clean_room_fragment(raw)]
    return [clean_room_fragment(p) for p in parts]


def load_checkpoint(checkpoint_file):
    if checkpoint_file.exists():
        return set(tuple(x) for x in json.loads(checkpoint_file.read_text()))
    return set()


def save_checkpoint_locked(done_set, lock, checkpoint_file):
    with lock:
        checkpoint_file.write_text(json.dumps(sorted(list(x) for x in done_set)))


def write_rows(
    writer, csv_file, csv_lock, campus_name, room_display, room_label, rows, context
):
    written = 0
    with csv_lock:
        for row in rows:
            day = normalize_day(row.get("Day", ""))
            start = convert_time_12h(row.get("Start", ""))
            finish = convert_time_12h(row.get("Finish", ""))
            duration = row.get("Duration", "").strip()
            scheduled_raw = row.get("Scheduled Dates", "").strip()
            raw_location = row.get("Location", "").strip()
            description = row.get("Description", "").strip()
            name = row.get("Name", "").strip()

            if not name and not scheduled_raw:
                continue

            resolved_dates = resolve_scheduled_dates(scheduled_raw, context=context)
            if not resolved_dates:
                logger.warning(
                    "[%s] no dates resolved from %r (class %r) - writing row with blank Date",
                    context,
                    scheduled_raw,
                    name,
                )
                resolved_dates = [None]

            cleaned_rooms = resolve_location_rooms(raw_location)

            for d in resolved_dates:
                date_str = d.isoformat() if d else ""
                for cleaned_room in cleaned_rooms:
                    writer.writerow(
                        {
                            "Campus": campus_name,
                            "RoomQueried": room_display,
                            "RoomLabel": room_label,
                            "Name": name,
                            "Day": day,
                            "Start": start,
                            "Finish": finish,
                            "Duration": duration,
                            "Date": date_str,
                            "ScheduledDatesRaw": scheduled_raw,
                            "Location": cleaned_room,
                            "Description": description,
                        }
                    )
                    written += 1
        csv_file.flush()
    return written


class ThreadState:
    """Each worker thread gets one of these: its own session, and its own
    cache of campus_guid -> ctx (so it doesn't reload state on every job)."""

    def __init__(self):
        self.session = new_session()
        self.ctx_cache = {}

    def get_ctx(self, campus_guid, force_reload=False):
        if force_reload or campus_guid not in self.ctx_cache:
            self.ctx_cache[campus_guid] = load_campus_state(self.session, campus_guid)
        return self.ctx_cache[campus_guid]


def format_weeks(week_values, week_labels):
    return [f"{v.strip()} ({week_labels.get(v, '?')})" for v in week_values]


def per_week_fallback(tstate, campus_guid, ctx, room_value, context, cfg):
    """Request one week at a time, merging whatever comes back.

    Two retry tiers for still-failing weeks:
    1. A few extra linear passes (interleaved with the other weeks in the
       same pass, so there's some real elapsed time between attempts).
    2. If weeks are STILL failing after that, they get real sleep-based
       exponential backoff. This matters because the weeks that get stuck
       tend to be the same ones across many different rooms (e.g. week 9,
       10, 12 failing on room after room) - that's a persistent server-side
       issue for those specific week values, not per-request noise, and it
       clears up with real wall-clock time rather than more attempts fired
       off quickly. Requeuing (like the room-level retry does) doesn't
       help here since other rooms hit the exact same weeks."""
    room_label = ""
    seen_rows = set()
    merged_rows = []
    remaining = list(ctx["week_values"])
    week_labels = ctx["week_labels"]

    def attempt_weeks(week_list, pass_label):
        nonlocal room_label
        still_failing = []
        for week_value in week_list:
            try:
                week_html = _request_room_html(
                    tstate.session, campus_guid, ctx, room_value, [week_value]
                )
            except Exception:
                logger.exception(
                    "[%s] week %s request raised (%s)",
                    context,
                    week_labels.get(week_value, week_value),
                    pass_label,
                )
                still_failing.append(week_value)
                continue

            if is_error_response(week_html):
                still_failing.append(week_value)
                continue

            label, rows = parse_room_table(week_html)
            room_label = room_label or label
            for row in rows:
                dedup_key = tuple(sorted(row.items()))
                if dedup_key in seen_rows:
                    continue
                seen_rows.add(dedup_key)
                merged_rows.append(row)

            time.sleep(cfg.request_delay)
        return still_failing

    # Tier 1: linear passes, no sleep beyond the per-request courtesy delay.
    for pass_num in range(1, cfg.max_per_week_passes + 1):
        if not remaining:
            break
        still_failing = attempt_weeks(remaining, f"pass {pass_num}")
        if still_failing:
            logger.warning(
                "[%s] pass %d: %d/%d weeks still failing: %s",
                context,
                pass_num,
                len(still_failing),
                len(remaining),
                format_weeks(still_failing, week_labels),
            )
        remaining = still_failing

    # Tier 2: real exponential backoff for weeks that survived tier 1.
    if remaining:
        for backoff_attempt in range(1, cfg.max_week_backoff_attempts + 1):
            if not remaining:
                break
            delay = min(
                cfg.week_backoff_base * (2 ** (backoff_attempt - 1)),
                cfg.week_backoff_max,
            )
            logger.warning(
                "[%s] backoff attempt %d/%d: sleeping %ds before retrying %d still-failing weeks: %s",
                context,
                backoff_attempt,
                cfg.max_week_backoff_attempts,
                delay,
                len(remaining),
                format_weeks(remaining, week_labels),
            )
            time.sleep(delay)
            remaining = attempt_weeks(remaining, f"backoff {backoff_attempt}")

    if remaining:
        logger.warning(
            "[%s] giving up on %d weeks after %d passes + %d backoff attempts: %s",
            context,
            len(remaining),
            cfg.max_per_week_passes,
            cfg.max_week_backoff_attempts,
            format_weeks(remaining, week_labels),
        )

    return room_label, merged_rows


def all_weeks_backoff(tstate, campus_guid, ctx, room_value, context, cfg):
    """Real sleep-based exponential backoff on the all-weeks request,
    after the fast requeue retries are exhausted but before dropping to
    per-week granularity. Returns (html_or_None, ctx) - html is None if
    every backoff attempt still errored."""
    for backoff_attempt in range(1, cfg.max_all_weeks_backoff_attempts + 1):
        delay = min(
            cfg.all_weeks_backoff_base * (2 ** (backoff_attempt - 1)),
            cfg.all_weeks_backoff_max,
        )
        logger.warning(
            "[%s] all-weeks backoff attempt %d/%d: sleeping %ds",
            context,
            backoff_attempt,
            cfg.max_all_weeks_backoff_attempts,
            delay,
        )
        time.sleep(delay)

        try:
            ctx = tstate.get_ctx(campus_guid, force_reload=True)
        except Exception:
            logger.exception(
                "[%s] failed to refresh session state (backoff attempt %d)",
                context,
                backoff_attempt,
            )

        try:
            html = _request_room_html(
                tstate.session, campus_guid, ctx, room_value, ctx["week_values"]
            )
        except Exception:
            logger.exception(
                "[%s] all-weeks request raised (backoff attempt %d)",
                context,
                backoff_attempt,
            )
            continue

        if not is_error_response(html):
            logger.info(
                "[%s] all-weeks succeeded on backoff attempt %d/%d",
                context,
                backoff_attempt,
                cfg.max_all_weeks_backoff_attempts,
            )
            return html, ctx

    return None, ctx


def process_job(
    tstate, job, writer, csv_file, csv_lock, done, done_lock, counters, cfg
):
    campus_name = job["campus_name"]
    campus_guid = job["campus_guid"]
    room_value = job["room_value"]
    room_display = job["room_display"]
    context = f"{campus_name}/{room_display}"

    try:
        ctx = tstate.get_ctx(campus_guid)
        html = _request_room_html(
            tstate.session, campus_guid, ctx, room_value, ctx["week_values"]
        )

        if is_error_response(html):
            job["attempts"] += 1
            if job["attempts"] < cfg.max_all_weeks_attempts:
                logger.warning(
                    "[%s] all-weeks request errored (attempt %d/%d) - "
                    "requeuing, refreshing session state",
                    context,
                    job["attempts"],
                    cfg.max_all_weeks_attempts,
                )
                try:
                    tstate.get_ctx(campus_guid, force_reload=True)
                except Exception:
                    logger.exception("[%s] failed to refresh session state", context)
                job["requeue"] = True
                return job
            else:
                logger.warning(
                    "[%s] all-weeks request errored %d times via requeue - "
                    "trying real backoff before per-week fallback",
                    context,
                    job["attempts"],
                )
                html, ctx = all_weeks_backoff(
                    tstate, campus_guid, ctx, room_value, context, cfg
                )
                if html is not None:
                    room_label, rows = parse_room_table(html)
                else:
                    logger.warning(
                        "[%s] all-weeks still erroring after %d backoff attempts - "
                        "falling back to per-week",
                        context,
                        cfg.max_all_weeks_backoff_attempts,
                    )
                    room_label, rows = per_week_fallback(
                        tstate, campus_guid, ctx, room_value, context, cfg
                    )
        else:
            room_label, rows = parse_room_table(html)

        n = write_rows(
            writer,
            csv_file,
            csv_lock,
            campus_name,
            room_display,
            room_label,
            rows,
            context,
        )

        with done_lock:
            done.add((campus_name, room_value))
            save_checkpoint_locked(done, done_lock, cfg.checkpoint_file)
            counters["rows"] += n

        logger.info("[%s] %d entries, %d rows written", context, len(rows), n)
        job["requeue"] = False
        return job

    except Exception:
        job["attempts"] += 1
        logger.exception(
            "[%s] job raised (attempt %d/%d)",
            context,
            job["attempts"],
            cfg.max_all_weeks_attempts,
        )
        if job["attempts"] < cfg.max_all_weeks_attempts:
            job["requeue"] = True
        else:
            logger.error(
                "[%s] giving up after %d failed attempts", context, job["attempts"]
            )
            job["requeue"] = False
        return job


def worker(work_queue, writer, csv_file, csv_lock, done, done_lock, counters, cfg):
    tstate = ThreadState()
    while True:
        job = work_queue.get()
        if job is None:
            work_queue.task_done()
            break
        result = process_job(
            tstate, job, writer, csv_file, csv_lock, done, done_lock, counters, cfg
        )
        if result is not None and result.get("requeue"):
            work_queue.put(result)
        time.sleep(cfg.request_delay)
        work_queue.task_done()


def build_job_queue(done, cfg):
    """Enumerate every campus/room up front (sequential, cheap - a handful
    of requests per campus) so the work queue can be flat across all
    campuses. Flat + shared queue means retries-via-requeue get spaced out
    by whatever other campus/room jobs are in flight, not just same-campus
    ones.

    Returns (work_queue, campus_order, total_rooms) - campus_order is
    captured here (from the explicit campus priority list, via
    campus_bucket()) so the final sort step doesn't need to redo it.
    Room ordering is computed later, directly from each room string's
    building number - see room_sort_value().
    """
    bootstrap_session = new_session()
    campuses = discover_campuses(bootstrap_session)
    logger.info("Discovered %d campuses: %s", len(campuses), ", ".join(campuses))

    if cfg.campus_filter:
        needle = cfg.campus_filter.lower()
        campuses = OrderedDict(
            (name, guid) for name, guid in campuses.items() if needle in name.lower()
        )
        logger.info(
            "--campus filter %r -> %d campus(es): %s",
            cfg.campus_filter,
            len(campuses),
            ", ".join(campuses),
        )

    # Sort order is the explicit priority list (CAMPUS_SORT_ORDER), not
    # the site's own dropdown order - see campus_bucket().
    campus_order = {name: campus_bucket(name)[1] for name in campuses}

    work_queue = queue.Queue()
    total_rooms = 0

    for campus_name, campus_guid in campuses.items():
        try:
            ctx = load_campus_state(bootstrap_session, campus_guid)
        except Exception:
            logger.exception("FAILED to load room list for %s", campus_name)
            continue

        logger.info("%s: %d rooms found.", campus_name, len(ctx["rooms"]))
        for room_value, room_display in ctx["rooms"]:
            total_rooms += 1
            if (campus_name, room_value) in done:
                continue
            work_queue.put(
                {
                    "campus_name": campus_name,
                    "campus_guid": campus_guid,
                    "room_value": room_value,
                    "room_display": room_display,
                    "attempts": 0,
                }
            )

    logger.info(
        "%d total rooms across all campuses, %d queued (rest already done).",
        total_rooms,
        work_queue.qsize(),
    )
    return work_queue, campus_order, total_rooms


def parse_generic_table(html):
    """Like parse_room_table but for reports with no single 'room label'
    concept (e.g. the Subject Timetable report, which can render one
    table per selected subject) - collects every cyon_table's rows as
    header/value dicts."""
    soup = BeautifulSoup(html, "html.parser")
    rows_out = []
    for t in soup.find_all("table", class_="cyon_table"):
        thead = t.find("thead")
        tbody = t.find("tbody")
        header_row = thead.find("tr") if thead else t.find("tr")
        if header_row is None:
            continue
        header = [
            collapse_ws(c.get_text(" ")) for c in header_row.find_all(["th", "td"])
        ]
        body_rows = tbody.find_all("tr") if tbody else t.find_all("tr")[1:]
        for r in body_rows:
            cells = r.find_all("td")
            if not cells:
                continue
            values = [cell_text(c) for c in cells]
            rows_out.append(dict(zip(header, values)))
    return rows_out


def load_subject_state(session):
    """Bootstrap the Subject Timetable report: get every subject in the
    dlObject list plus the shared weeks/days/period option values. Unlike
    locations (which need a second postback to pick a campus before the
    room dropdown populates), the subject list has no dependent dropdown,
    so one postback is enough."""
    r = session.get(BASE + "Default.aspx", headers=HEADERS, timeout=30)
    r.raise_for_status()
    state, _ = get_form_state(r.text)

    html2 = postback(session, BASE + "Default.aspx", state, "LinkBtn_modules")
    state2, soup2 = get_form_state(html2)

    subjects = [
        o.get("value")
        for o in soup2.find("select", {"id": "dlObject"}).find_all("option")
        if o.get("value")
    ]

    days_all_week = option_value_by_text(
        soup2, "lbDays", "All Week"
    ) or first_option_value(soup2, "lbDays")
    period_value = (
        option_value_by_text(soup2, "dlPeriod", "All Day")
        or option_value_by_text(soup2, "dlPeriod", "Teaching Day")
        or first_option_value(soup2, "dlPeriod")
    )
    weeks_sel = soup2.find("select", {"id": "lbWeeks"})
    week_values = [
        o.get("value")
        for o in weeks_sel.find_all("option")
        if o.get("value") not in ("t", "n")
    ]

    return {
        "state": state2,
        "subjects": subjects,
        "days_all_week": days_all_week,
        "period_value": period_value,
        "week_values": week_values,
    }


def _request_subject_chunk_html(session, ctx, subject_values):
    """One postback for a batch of subjects (dlObject accepts multiple
    values in a single POST, so many subjects can be queried per request
    instead of one at a time - there are thousands of subjects, so
    per-subject requests would be prohibitively slow)."""
    pairs = [("tLinkType", "modules"), ("tWildcard", "")]
    pairs += [("dlObject", v) for v in subject_values]
    pairs += [("lbWeeks", w) for w in ctx["week_values"]]
    pairs += [("lbDays", ctx["days_all_week"])]
    pairs += [("dlPeriod", ctx["period_value"])]
    pairs += [("RadioType", "module_list;cyon_reports_list_url;dummy")]
    pairs += [("bGetTimetable", "View Timetable")]
    return postback_multi(
        session, BASE + "Default.aspx", ctx["state"], "bGetTimetable", pairs
    )


def _scrape_subject_chunk(session, ctx, chunk, request_delay, depth=0):
    """Query one batch of subjects and return {Activity: ClassType}.
    A batch that errors (too large for one postback, transient site
    issue, etc.) is split in half and retried recursively rather than
    dropped outright, down to a floor of 10 subjects/4 levels deep before
    giving up on that slice and logging a warning."""
    if not chunk:
        return {}
    try:
        html = _request_subject_chunk_html(session, ctx, chunk)
    except Exception:
        html = None
        logger.exception(
            "Subject-chunk request raised (%d subjects, depth %d)", len(chunk), depth
        )

    if html is None or is_error_response(html):
        if len(chunk) <= 10 or depth >= 4:
            logger.warning(
                "Giving up on a %d-subject chunk for class-type lookup after repeated errors.",
                len(chunk),
            )
            return {}
        mid = len(chunk) // 2
        result = {}
        result.update(
            _scrape_subject_chunk(session, ctx, chunk[:mid], request_delay, depth + 1)
        )
        time.sleep(request_delay)
        result.update(
            _scrape_subject_chunk(session, ctx, chunk[mid:], request_delay, depth + 1)
        )
        return result

    lookup = {}
    for row in parse_generic_table(html):
        activity = (row.get("Activity") or "").strip()
        class_type = (row.get("Class Type") or "").strip()
        if activity and class_type:
            lookup[activity] = class_type
    return lookup


def scrape_class_type_lookup(cfg):
    """Build an {Activity: ClassType} lookup from the site's Subject
    Timetable report, which has an authoritative "Class Type" column
    (e.g. "Lecture"/"Tutorial") that the Location Timetable report used
    for the main scrape doesn't expose - the raw Name field there only
    encodes a terse class-type code (e.g. "T", "CL"). "Activity" in this
    report is expected to match "Name" from the location scrape 1:1
    (same underlying naming scheme) - this is the one part of the
    mapping that should be spot-checked against a real run, since it's
    written without having seen a live Subject Timetable response.

    Runs single-threaded (not per-worker like the room scrape): querying
    many subjects per request means far fewer total requests than the
    room scrape needs, so parallelism matters less here.
    """
    if cfg.skip_class_types:
        logger.info(
            "Skipping Subject Timetable class-type scrape (--skip-class-types)."
        )
        return {}

    session = new_session()
    logger.info("Discovering subjects for class-type lookup...")
    try:
        ctx = load_subject_state(session)
    except Exception:
        logger.exception(
            "Failed to load the subject list - Class field will use the raw-code fallback only."
        )
        return {}

    subjects = ctx["subjects"]
    logger.info(
        "%d subjects found; querying in chunks of %d.",
        len(subjects),
        cfg.subject_chunk_size,
    )

    lookup = {}
    chunks = [
        subjects[i : i + cfg.subject_chunk_size]
        for i in range(0, len(subjects), cfg.subject_chunk_size)
    ]
    for idx, chunk in enumerate(chunks, 1):
        chunk_lookup = _scrape_subject_chunk(session, ctx, chunk, cfg.request_delay)
        lookup.update(chunk_lookup)
        logger.info(
            "Class-type chunk %d/%d: %d activities resolved (running total %d).",
            idx,
            len(chunks),
            len(chunk_lookup),
            len(lookup),
        )
        time.sleep(cfg.request_delay)

    logger.info("Class-type lookup complete: %d total activities.", len(lookup))
    return lookup


_BUILDING_PART_RE = re.compile(r"^(\d+)([A-Za-z]*)$")


def room_sort_value(room):
    """Sort key for a room string, keyed off the building number (the
    part before the first hyphen), per explicit instruction:
      - Numeric, not lexicographic: "300-UG03" sorts after "4-101", not
        between "3-101" and "4-101".
      - A lettered variant sorts right after its plain building number:
        "25-G04" before "25A-101" (building 25, no suffix, sorts before
        building 25's "A" suffix).
      - Anything without a clean leading building number (a dropped
        merge-combo label, "0-00" for TBA, "Online", etc.) sorts after
        every real building number, ordered naturally among themselves.
    """
    room = room or ""
    building_part = room.split("-", 1)[0]
    rest = room[len(building_part) :]
    m = _BUILDING_PART_RE.match(building_part)
    if m:
        return (0, int(m.group(1)), m.group(2), natural_key(rest))
    return (1, 0, "", natural_key(room))


def sort_raw_rows(rows, campus_order):
    def key(row):
        campus = row.get("Campus", "")
        return (
            campus_order.get(campus, 9999),
            room_sort_value(row.get("RoomQueried", "")),
            DAY_ORDER.get(row.get("Day", ""), 99),
            row.get("Start", ""),
            row.get("Date", "") or "",
            row.get("Name", ""),
        )

    return sorted(rows, key=key)


def sort_classes_rows(rows, campus_order, raw_campus_by_classes_campus):
    def key(row):
        raw_campus = raw_campus_by_classes_campus.get(
            row.get("Campus", ""), row.get("Campus", "")
        )
        return (
            campus_order.get(raw_campus, 9999),
            room_sort_value(row.get("Room", "")),
            DAY_ORDER.get(row.get("Day", ""), 99),
            row.get("StartTime", ""),
            row.get("Date", "") or "",
            row.get("SubCode", ""),
        )

    return sorted(rows, key=key)


def dedupe_classes_rows(rows):
    """Drop exact-duplicate classes.csv rows. These arise legitimately:
    an event occupying several rooms at once (a merged Location split
    into individual rooms) gets scraped independently once per room it
    was found via - querying room A finds the event and splits its
    Location into {A, B, C}; querying room B finds the SAME event and
    independently splits the SAME Location into {A, B, C} again - so the
    full room set gets written once per room it was discovered through.
    Rows here are true duplicates only when every field matches, so a
    plain identity check on the whole row is enough."""
    seen = set()
    out = []
    for row in rows:
        key = tuple(row.get(k, "") for k in CLASSES_FIELDNAMES)
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def finalize_outputs(cfg, campus_order, class_type_lookup=None):
    """Read the raw CSV back in full, sort it (explicit campus priority
    order, then building-number room order), rewrite it atomically, then
    derive + write classes.csv (vacansee-au schema) from those same
    sorted rows, also atomically."""
    if not cfg.raw_output.exists():
        logger.warning("No raw output at %s - nothing to finalize.", cfg.raw_output)
        return

    with cfg.raw_output.open("r", newline="", encoding="utf-8") as f:
        raw_rows = list(csv.DictReader(f))

    raw_rows = sort_raw_rows(raw_rows, campus_order)

    tmp_raw = cfg.raw_output.with_suffix(cfg.raw_output.suffix + ".tmp")
    with tmp_raw.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=RAW_FIELDNAMES)
        w.writeheader()
        w.writerows({k: row.get(k, "") for k in RAW_FIELDNAMES} for row in raw_rows)
    tmp_raw.replace(cfg.raw_output)
    logger.info("Sorted + rewrote %d raw rows -> %s", len(raw_rows), cfg.raw_output)

    raw_campus_by_classes_campus = {}
    classes_rows = []
    for row in raw_rows:
        raw_campus = row.get("Campus", "")
        classes_campus = normalize_campus_for_classes(raw_campus)
        raw_campus_by_classes_campus.setdefault(classes_campus, raw_campus)
        subcode, cls = derive_subcode_class(
            row.get("Name", ""), row.get("Description", ""), class_type_lookup
        )
        classes_rows.append(
            {
                "SubCode": subcode,
                "Class": cls,
                "Day": row.get("Day", ""),
                "StartTime": row.get("Start", ""),
                "EndTime": row.get("Finish", ""),
                # Room comes from raw's resolved "Location" column, not
                # "RoomQueried" - an event that occupies several rooms at
                # once (a merged Location split into individuals) gets
                # discovered independently when scraping EACH of those rooms,
                # so the same occurrence can appear once per room it was
                # found via, each time with the full split-room set attached.
                # dedupe_classes_rows() below collapses those repeats.
                "Room": row.get("Location", ""),
                "Date": row.get("Date", ""),
                "Campus": classes_campus,
                "Description": row.get("Description", ""),
            }
        )

    before_dedupe = len(classes_rows)
    classes_rows = dedupe_classes_rows(classes_rows)
    if before_dedupe != len(classes_rows):
        logger.info(
            "Dropped %d duplicate classes.csv rows (same event discovered via multiple queried rooms).",
            before_dedupe - len(classes_rows),
        )
    classes_rows = sort_classes_rows(
        classes_rows, campus_order, raw_campus_by_classes_campus
    )

    cfg.classes_output.parent.mkdir(parents=True, exist_ok=True)
    tmp_classes = cfg.classes_output.with_suffix(cfg.classes_output.suffix + ".tmp")
    with tmp_classes.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CLASSES_FIELDNAMES)
        w.writeheader()
        w.writerows(
            {k: row.get(k, "") for k in CLASSES_FIELDNAMES} for row in classes_rows
        )
    tmp_classes.replace(cfg.classes_output)
    logger.info(
        "Derived + wrote %d classes rows -> %s", len(classes_rows), cfg.classes_output
    )


def setup_logging(log_file):
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter(
        fmt="%(asctime)s %(threadName)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    fh = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=20 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    fh.setFormatter(fmt)
    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(fh)
    logger.addHandler(sh)


def parse_args():
    p = argparse.ArgumentParser(
        description="Scrape UOW Timetable Web Viewer (WRB) - all campuses, all rooms."
    )
    p.add_argument(
        "--raw-output",
        default="public/raw/raw_classes.csv",
        help="Raw scrape CSV path (default: public/raw/raw_classes.csv)",
    )
    p.add_argument(
        "--classes-output",
        default="public/classes.csv",
        help="Derived vacansee-au-schema CSV path (default: public/classes.csv)",
    )
    p.add_argument(
        "--checkpoint-file",
        default="public/raw/uow_wrb_checkpoint.json",
        help="Checkpoint file for resuming an interrupted run, kept alongside the raw output it belongs "
        "to (default: public/raw/uow_wrb_checkpoint.json)",
    )
    p.add_argument(
        "--log-file",
        default="public/uow_wrb_scraper.log",
        help="Log file path (default: uow_wrb_scraper.log)",
    )
    p.add_argument(
        "--campus",
        dest="campus_filter",
        default=None,
        help="Only scrape campuses whose name contains this substring (case-insensitive). Default: all.",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Discover campuses/rooms/subjects and print counts, then exit without scraping anything.",
    )
    p.add_argument(
        "--skip-class-types",
        action="store_true",
        help="Skip the Subject Timetable scrape used to fill in classes.csv's Class column with real "
        "class-type names (Lecture/Tutorial/etc); falls back to a terse raw code instead.",
    )
    p.add_argument(
        "--subject-chunk-size",
        type=int,
        default=50,
        help="Subjects queried per Subject Timetable request for the class-type lookup (default: 50)",
    )
    p.add_argument(
        "--num-workers",
        type=int,
        default=32,
        help="Concurrent worker threads (default: 32)",
    )
    p.add_argument(
        "--request-delay",
        type=float,
        default=0.1,
        help="Seconds to sleep between requests per worker (default: 0.1)",
    )
    p.add_argument(
        "--max-all-weeks-attempts",
        type=int,
        default=5,
        help="Fast requeue retries for the all-weeks request before real backoff (default: 5)",
    )
    p.add_argument(
        "--max-all-weeks-backoff-attempts",
        type=int,
        default=5,
        help="Sleep-based backoff attempts for the all-weeks request before per-week fallback (default: 5)",
    )
    p.add_argument(
        "--all-weeks-backoff-base",
        type=float,
        default=2,
        help="Base seconds for all-weeks backoff, doubles each attempt (default: 2)",
    )
    p.add_argument(
        "--all-weeks-backoff-max",
        type=float,
        default=60,
        help="Cap in seconds for all-weeks backoff delay (default: 60)",
    )
    p.add_argument(
        "--max-per-week-passes",
        type=int,
        default=3,
        help="Linear per-week retry passes in the per-week fallback (default: 3)",
    )
    p.add_argument(
        "--max-week-backoff-attempts",
        type=int,
        default=2,
        help="Sleep-based backoff attempts for still-failing weeks (default: 2)",
    )
    p.add_argument(
        "--week-backoff-base",
        type=float,
        default=2,
        help="Base seconds for per-week backoff, doubles each attempt (default: 2)",
    )
    p.add_argument(
        "--week-backoff-max",
        type=float,
        default=60,
        help="Cap in seconds for per-week backoff delay (default: 60)",
    )
    args = p.parse_args()

    args.raw_output = Path(args.raw_output)
    args.classes_output = Path(args.classes_output)
    args.checkpoint_file = Path(args.checkpoint_file)
    args.log_file = Path(args.log_file)
    return args


def main():
    cfg = parse_args()
    setup_logging(cfg.log_file)

    cfg.raw_output.parent.mkdir(parents=True, exist_ok=True)

    done = load_checkpoint(cfg.checkpoint_file)

    if cfg.dry_run:
        work_queue, campus_order, total_rooms = build_job_queue(done, cfg)
        logger.info(
            "Dry run: %d rooms total, %d already checkpointed, %d queued. "
            "No requests will be made for room data.",
            total_rooms,
            len(done),
            work_queue.qsize(),
        )
        if not cfg.skip_class_types:
            logger.info(
                "Dry run: skipping the Subject Timetable class-type scrape too "
                "(pass --skip-class-types explicitly to silence this note on a real run)."
            )
        return

    write_header = not cfg.raw_output.exists()

    csv_file = cfg.raw_output.open("a", newline="", encoding="utf-8")
    writer = csv.DictWriter(csv_file, fieldnames=RAW_FIELDNAMES)
    if write_header:
        writer.writeheader()
        csv_file.flush()

    csv_lock = threading.Lock()
    done_lock = threading.RLock()
    counters = {"rows": 0}

    work_queue, campus_order, total_rooms = build_job_queue(done, cfg)

    threads = []
    for i in range(cfg.num_workers):
        t = threading.Thread(
            target=worker,
            args=(
                work_queue,
                writer,
                csv_file,
                csv_lock,
                done,
                done_lock,
                counters,
                cfg,
            ),
            name=f"worker-{i}",
            daemon=True,
        )
        t.start()
        threads.append(t)

    work_queue.join()

    for _ in threads:
        work_queue.put(None)
    for t in threads:
        t.join()

    csv_file.close()
    logger.info("Scrape done. %d rows written to %s", counters["rows"], cfg.raw_output)

    class_type_lookup = scrape_class_type_lookup(cfg)

    finalize_outputs(cfg, campus_order, class_type_lookup)


if __name__ == "__main__":
    main()

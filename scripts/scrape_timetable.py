"""Public UOW SOLSS timetable scraper for vacansee-au.

Hits the public SOLSS API (no authentication) with a single request per
campus and writes a CSV consumed by upload_timetable.py / generate_schedule.py.

Each class's "week" field (a SOLSS week-number range, a literal date, or a
mix of both) is resolved into actual calendar dates using academic_calendar.py,
which scrapes UOW's key dates page and non-standard sessions PDF at runtime
(no dates are hardcoded anywhere in this pipeline). Recess periods are
already baked into the standard sessions' published week-block dates, so no
separate recess subtraction is needed for them.

GSM sessions are a special case: their non-standard PDF entry gives only a
start/end span with no usable week breakdown, and the gaps within a GSM
session shift unpredictably year to year. Per agreed approach, every
weekday occurrence of a GSM class across its full session span is marked
busy, *unless* another (already-resolved) class occupies the same date,
room, and time - in which case the GSM occurrence is dropped in favour of
the real class.

Raw JSON responses are saved as raw_timetable_<campus>.json alongside the CSV.

A cheap "preload" request also returns the timetable publish date; we
compare it against the cached value in --last-run-file and skip the full
multi-campus scrape when nothing has changed. Pass --force to bypass that
check. The same preload response provides the session_id -> session_name
map used to resolve each subject's session.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

from academic_calendar import AcademicCalendar, WEEKDAY_INDEX
from resolve_weeks import resolve_class_dates

URL = "https://solss.uow.edu.au/apir/Public_subjectDB.timetable"
PRELOAD_URL = "https://solss.uow.edu.au/apir/Public_subjectDB.timetable_preload"

LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "T", "H"]

CAMPUSES = {
    "1":  "Wollongong",
    "5":  "Eurobodalla",
    "4":  "Bega Valley",
    "52": "Innovation Campus",
    "3":  "Shoalhaven",
    "62": "Liverpool",
    "34": "Southern Highlands",
    "38": "Sutherland",
    "2":  "Sydney",
    "65": "UOW Online Wollongong",
}

# SOLSS returns abbreviated weekdays; the app queries full day names
# (getCurrentDayName() -> "Monday"). Normalize so availability matches.
DAY_NORMALIZATION = {
    "mon": "Monday", "monday": "Monday",
    "tue": "Tuesday", "tues": "Tuesday", "tuesday": "Tuesday",
    "wed": "Wednesday", "weds": "Wednesday", "wednesday": "Wednesday",
    "thu": "Thursday", "thur": "Thursday", "thurs": "Thursday", "thursday": "Thursday",
    "fri": "Friday", "friday": "Friday",
    "sat": "Saturday", "saturday": "Saturday",
    "sun": "Sunday", "sunday": "Sunday",
}

FIELDNAMES = [
    "SubCode", "Class", "Day", "StartTime", "EndTime",
    "Room", "Date", "Campus",
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

# Scrape iteration order — used only to break ties, never as a primary A-Z sort.
CAMPUS_ORDER = {name: idx for idx, name in enumerate(CAMPUSES.values())}

TBA_ROOM = "0-00"


# ── Utilities ─────────────────────────────────────────────────────────────────

def normalize_whitespace(text: str | None) -> str:
    """Collapse internal whitespace and strip leading/trailing."""
    if not isinstance(text, str):
        return ""
    return " ".join(text.split())


def format_time_hhmm(time_str: str | None) -> str:
    """Normalize a time string to HH:MM; return as-is if unparseable."""
    if not time_str:
        return ""
    norm = normalize_whitespace(time_str)
    try:
        return datetime.strptime(norm, "%H:%M").strftime("%H:%M")
    except ValueError:
        return norm


def normalize_day(raw: str) -> str:
    """Map an abbreviated/long weekday to its full English name (or "")."""
    if not raw:
        return ""
    return DAY_NORMALIZATION.get(raw.strip().lower(), raw.strip())


def campus_to_filename(campus_name: str) -> str:
    """Sanitize a campus name for use in a filename."""
    return re.sub(r"[^\w]+", "_", campus_name).strip("_")


def split_on_delimiters(raw: str) -> list[str]:
    """Split on semicolons and ampersands; strip and drop empty parts."""
    parts = re.split(r"[;&]", raw)
    return [p.strip() for p in parts if p.strip()]


# &, &amp, &amp; all treated as splitters (same as ;), not deleted.
_AMP_RE = re.compile(r"&amp;?|&", re.IGNORECASE)

# Any of these (case-insensitive, trailing period ignored) collapse to "Online".
_ONLINE_VARIANTS = {
    "class online", "lecture online", "online", "online optional room available",
}

# "300-UG-03" -> "300-UG03": second hyphen dropped, letters+suffix fused.
_ROOM_CODE_RE = re.compile(r"^(\d+)-([A-Za-z]+)-(\w+)$")

# "LP_400-101" -> "400-101": LP_ prefix dropped only when it precedes a "400-" prefix.
_LP_PREFIX_RE = re.compile(r"^LP_400-")


def normalize_room_delimiters(raw_room: str) -> str:
    """Fold &, &amp, &amp; into ';' so they split the same way semicolons do."""
    return _AMP_RE.sub(";", raw_room)


def clean_room_fragment(room: str) -> str:
    """Fix one already-split room: Online aliases, second-hyphen room-code
    fix, 400-LP_ prefix strip, then 'To be advised' -> 0-00.
    """
    room = normalize_whitespace(room)

    online_key = room.rstrip(".").strip().lower()
    if online_key in _ONLINE_VARIANTS:
        return "Online"

    room = _LP_PREFIX_RE.sub("400-", room)

    m = _ROOM_CODE_RE.fullmatch(room)
    if m:
        num, letters, rest = m.groups()
        room = f"{num}-{letters}{rest}"

    if room.strip().lower() == "to be advised":
        room = TBA_ROOM

    return room


# ── Publish-date cache + session map ──────────────────────────────────────────

def fetch_preload(campus_id: str = "1") -> dict:
    r = requests.post(PRELOAD_URL, data={"p_campus_id": campus_id, "p_type": "a"}, timeout=10)
    r.raise_for_status()
    return r.json()


def get_last_publish_date(preload: dict) -> datetime | None:
    raw = preload.get("last_update_date")
    if not raw:
        return None
    return datetime.strptime(raw.strip(), "%d %b, %Y %I:%M:%S%p")


def get_session_map(preload: dict) -> dict[str, str]:
    """session_id -> session_name, e.g. '2591' -> 'Autumn'."""
    return {s["session_id"]: s["session_name"] for s in preload.get("sessions", [])}


def get_last_run(last_run_file: Path) -> datetime | None:
    if not last_run_file.exists():
        return None
    try:
        return datetime.fromisoformat(last_run_file.read_text().strip())
    except ValueError:
        return None


def save_last_run(last_run_file: Path, publish_date: datetime) -> None:
    last_run_file.write_text(publish_date.isoformat())


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_campus(campus_id: str) -> list:
    """Fetch all subjects for a campus in one request (no unit filter)."""
    payload = [
        ("p_campus_id", campus_id),
        ("p_type", "a"),
        ("p_subject_code", ""),
        ("p_subject_name", ""),
        ("p_session_id_arr", "-1"),
        ("p_unit_abb_arr", ""),  # empty = all units
    ] + [("p_level_arr", lvl) for lvl in LEVELS]

    r = requests.post(URL, data=payload, timeout=60)
    r.raise_for_status()
    data = r.json()

    if data.get("status") != "success":
        print(f"  unexpected status: {data.get('status')!r}")
        return []

    subjects = data.get("subjects", [])
    # The API sometimes returns "" or 0 instead of [] for an empty result.
    return [s for s in subjects if isinstance(s, dict)]


# ── Flatten: normal (non-GSM) subjects ────────────────────────────────────────

def flatten_normal(
    subjects: list,
    campus_name: str,
    session_map: dict[str, str],
    calendar: AcademicCalendar,
) -> tuple[list[dict], set]:
    """Resolve every non-GSM subject's classes to specific dates.

    Returns (rows, occupied) where occupied is the set of
    (date, room, StartTime, EndTime) tuples these rows fill, used by
    flatten_gsm() to detect clashes.
    """
    rows: list[dict] = []
    occupied: set[tuple] = set()

    for s in subjects:
        session_name = session_map.get(s.get("session_id", ""), "")
        if not session_name or AcademicCalendar.is_gsm(session_name):
            continue  # handled by flatten_gsm

        try:
            year = int(s.get("subject_year") or 0)
        except ValueError:
            year = 0

        sub_code = normalize_whitespace(s.get("subject_code", ""))

        for ti, t in enumerate(s.get("timetable", [])):
            day = normalize_day(t.get("day", ""))
            start = format_time_hhmm(t.get("start_time", ""))
            end = format_time_hhmm(t.get("end_time", ""))
            raw_room = normalize_whitespace(t.get("location", ""))
            raw_class = normalize_whitespace(t.get("activity", ""))
            week_field = normalize_whitespace(t.get("week", ""))

            if not (day and start and end and raw_room):
                continue  # Moodle-only / pre-recorded activity, no schedule

            dates = resolve_class_dates(week_field, session_name, year, day, calendar)
            if not dates:
                continue

            room_value = normalize_room_delimiters(raw_room)
            class_names = split_on_delimiters(raw_class) if raw_class else [""]
            rooms = [clean_room_fragment(r) for r in split_on_delimiters(room_value)] if room_value else [""]

            for d in dates:
                date_str = d.isoformat()
                for room in rooms:
                    occupied.add((date_str, room, start, end))
                    for ci, class_name in enumerate(class_names):
                        rows.append({
                            "SubCode":   sub_code,
                            "Class":     class_name,
                            "Day":       day,
                            "StartTime": start,
                            "EndTime":   end,
                            "Room":      room,
                            "Date":      date_str,
                            "Campus":    campus_name,
                            # JSON timetable entry index + split position; not written to CSV.
                            "_class_order": (ti, ci),
                        })

    return rows, occupied


# ── Flatten: GSM overlay pass ──────────────────────────────────────────────────

def flatten_gsm(
    subjects: list,
    campus_name: str,
    session_map: dict[str, str],
    calendar: AcademicCalendar,
    occupied: set,
) -> list[dict]:
    """Mark every weekday occurrence across a GSM subject's full session
    span as busy, skipping any (date, room, time) already taken by a
    properly-resolved class from flatten_normal().
    """
    rows: list[dict] = []

    for s in subjects:
        session_name = session_map.get(s.get("session_id", ""), "")
        if not session_name or not AcademicCalendar.is_gsm(session_name):
            continue

        try:
            year = int(s.get("subject_year") or 0)
        except ValueError:
            year = 0

        span = calendar.get_span(session_name, year)
        if span is None:
            continue
        span_start, span_end = span

        sub_code = normalize_whitespace(s.get("subject_code", ""))

        for ti, t in enumerate(s.get("timetable", [])):
            day = normalize_day(t.get("day", ""))
            start = format_time_hhmm(t.get("start_time", ""))
            end = format_time_hhmm(t.get("end_time", ""))
            raw_room = normalize_whitespace(t.get("location", ""))
            raw_class = normalize_whitespace(t.get("activity", ""))

            if not (day and start and end and raw_room):
                continue

            offset = WEEKDAY_INDEX.get(day)
            if offset is None:
                continue

            room_value = normalize_room_delimiters(raw_room)
            class_names = split_on_delimiters(raw_class) if raw_class else [""]
            rooms = [clean_room_fragment(r) for r in split_on_delimiters(room_value)] if room_value else [""]

            days_ahead = (offset - span_start.weekday()) % 7
            d = span_start + timedelta(days=days_ahead)

            while d <= span_end:
                date_str = d.isoformat()
                for room in rooms:
                    if (date_str, room, start, end) in occupied:
                        continue  # a real class already occupies this slot
                    for ci, class_name in enumerate(class_names):
                        rows.append({
                            "SubCode":   sub_code,
                            "Class":     class_name,
                            "Day":       day,
                            "StartTime": start,
                            "EndTime":   end,
                            "Room":      room,
                            "Date":      date_str,
                            "Campus":    campus_name,
                            "_class_order": (ti, ci),
                        })
                d += timedelta(days=7)

    return rows


# ── Scrape orchestration ──────────────────────────────────────────────────────

def scrape(raw_dir: Path, session_map: dict[str, str], calendar: AcademicCalendar) -> list[dict]:
    all_rows: list[dict] = []
    raw_dir.mkdir(parents=True, exist_ok=True)

    for campus_id, campus_name in CAMPUSES.items():
        print(f"\n--- {campus_name} ---", flush=True)
        try:
            subjects = fetch_campus(campus_id)

            safe = campus_to_filename(campus_name)
            raw_path = raw_dir / f"raw_timetable_{safe}.json"
            raw_path.write_text(
                json.dumps(subjects, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

            normal_rows, occupied = flatten_normal(subjects, campus_name, session_map, calendar)
            gsm_rows = flatten_gsm(subjects, campus_name, session_map, calendar, occupied)

            all_rows.extend(normal_rows)
            all_rows.extend(gsm_rows)

            print(
                f"  {len(subjects)} subjects, {len(normal_rows)} normal rows, "
                f"{len(gsm_rows)} GSM overlay rows -> {raw_path.name}"
            )
        except Exception as e:  # noqa: BLE001 — keep scraping other campuses
            print(f"  ERROR: {e}")

        time.sleep(0.5)

    return all_rows


def sort_rows(rows: list[dict]) -> list[dict]:
    """Sort by campus (scrape order), then subcode, weekday, start, date, class.

    Campus uses ``CAMPUSES`` iteration order first. Class type uses JSON timetable
    entry index as the final tiebreaker. ``_class_order`` is not written to CSV.
    """

    def key(row: dict) -> tuple:
        return (
            CAMPUS_ORDER.get(row.get("Campus", ""), 99),
            row.get("SubCode", ""),
            DAY_ORDER.get(row.get("Day", ""), 99),
            row.get("StartTime", ""),
            row.get("Date", ""),
            row.get("_class_order", (999, 999)),
        )

    return sorted(rows, key=key)


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape UOW SOLSS timetable data.")
    parser.add_argument(
        "--output",
        default="public/classes.csv",
        help="CSV output path (default: public/classes.csv)",
    )
    parser.add_argument(
        "--raw-dir",
        default=None,
        help="Directory for raw JSON files (default: --output/raw)",
    )
    parser.add_argument(
        "--last-run-file",
        default="public/cache/last_run.txt",
        help="Path to the publish-date cache file (default: public/cache/last_run.txt)",
    )
    parser.add_argument(
        "--calendar-cache-file",
        default="public/cache/academic_calendar_cache.json",
        help="Path to the academic calendar disk cache (default: public/cache/academic_calendar_cache.json)",
    )
    parser.add_argument(
        "--calendar-cache-days",
        type=int,
        default=7,
        help="Max age in days for the academic calendar cache (default: 7)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Scrape even if the SOLSS publish date is unchanged.",
    )
    args = parser.parse_args()

    out           = Path(args.output)
    raw_dir       = Path(args.raw_dir) if args.raw_dir else out.parent.joinpath("raw")
    last_run_file = Path(args.last_run_file)

    publish_date = None
    session_map: dict[str, str] = {}
    try:
        preload = fetch_preload()
        publish_date = get_last_publish_date(preload)
        session_map = get_session_map(preload)
    except Exception as e:  # noqa: BLE001 — preload is best-effort for the date check
        print(f"Preload check failed ({e}); continuing with scrape.")

    last_run = get_last_run(last_run_file)

    if publish_date:
        print(f"Last publish date : {publish_date.strftime('%d %b %Y %I:%M:%S %p')}")
    if last_run:
        print(f"Last run          : {last_run.strftime('%d %b %Y %I:%M:%S %p')}")

    if not args.force and publish_date and last_run and publish_date <= last_run:
        print("No update since last run. Skipping.")
        return 0

    if not session_map:
        # Preload failed but we're scraping anyway (e.g. --force with a
        # transient preload error) - fetch it again, this time required.
        preload = fetch_preload()
        session_map = get_session_map(preload)

    print("\nBuilding academic calendar...")
    calendar = AcademicCalendar.load_or_fetch(
        cache_file=Path(args.calendar_cache_file),
        max_age=timedelta(days=args.calendar_cache_days),
    )
    print(f"  {len(calendar.standard)} standard session/year entries, "
          f"{len(calendar.nonstandard)} non-standard sessions")

    all_rows = sort_rows(scrape(raw_dir, session_map, calendar))

    if not all_rows:
        print("No data scraped.")
        return 1

    # Atomic write: write to a temp file first, then rename into place.
    # Prevents truncating the existing CSV if the script crashes mid-write.
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES)
        w.writeheader()
        w.writerows({k: row[k] for k in FIELDNAMES} for row in all_rows)
    tmp.replace(out)

    print(f"\nDone. {len(all_rows)} rows -> {out}")

    if publish_date:
        save_last_run(last_run_file, publish_date)

    return 0


if __name__ == "__main__":
    sys.exit(main())
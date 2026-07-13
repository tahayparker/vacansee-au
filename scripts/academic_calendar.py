"""Academic calendar scraper for UOW key dates + non-standard session PDF.

No dates are hardcoded here. Everything (session start dates, teaching week
blocks, non-standard session spans) is scraped at runtime from:

  - https://www.uow.edu.au/student/dates/   (standard sessions: Autumn,
    Spring, Annual, Trimester 1/2/3, Summer)
  - the non-standard sessions PDF linked from that same page. The PDF's URL
    is discovered by scraping the page, never hardcoded, since it changes
    every year.

Recess handling: standard sessions list their teaching weeks directly as
"Lectures Commence (weeks A-B)" / "Lectures Recommence (weeks C-D)" blocks
with explicit date ranges, so recess gaps never need to be located or
subtracted separately - the published week numbers and dates already skip
them. Non-standard sessions (nursing, GSM, SMAH, Winter, etc.) only publish
a single start/end date with no week breakdown, so per the agreed approach
recess is assumed not to apply to them.
"""

from __future__ import annotations

import io
import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

KEY_DATES_URL = "https://www.uow.edu.au/student/dates/"

WEEKDAY_INDEX = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}

_MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


# ── Date parsing ──────────────────────────────────────────────────────────────

_DATE_RANGE_RE = re.compile(
    r"(\d{1,2})\s*([A-Za-z]{3,9})\s*[\u2013\u2014-]\s*(\d{1,2})\s*([A-Za-z]{3,9})\s*(\d{4})"
)


def _month_num(name: str) -> int | None:
    return _MONTHS.get(name.strip().lower()[:3])


def parse_date_range(text: str) -> tuple[date, date] | None:
    """Parse 'DD Mon - DD Mon YYYY' into (start, end).

    UOW's page occasionally lists a Dec-to-Jan range under a single year
    (e.g. "21 Dec - 01 Jan 2026" for a session that actually runs into
    2027). If the parsed end date would fall before the start date under
    the stated year, the end date's year is bumped by one to fix this.
    """
    m = _DATE_RANGE_RE.search(text)
    if not m:
        return None
    d1, mo1, d2, mo2, y = m.groups()
    m1, m2 = _month_num(mo1), _month_num(mo2)
    if m1 is None or m2 is None:
        return None
    year = int(y)
    start = date(year, m1, int(d1))
    end = date(year, m2, int(d2))
    if end < start:
        end = date(year + 1, m2, int(d2))
    return start, end


# ── Standard sessions (key dates page) ───────────────────────────────────────


@dataclass
class TeachingBlock:
    week_start: int
    week_end: int
    date_start: date  # Monday of week_start

    def resolve(self, week_num: int, weekday_name: str) -> date | None:
        if not (self.week_start <= week_num <= self.week_end):
            return None
        offset = WEEKDAY_INDEX.get(weekday_name)
        if offset is None:
            return None
        monday = self.date_start + timedelta(days=7 * (week_num - self.week_start))
        return monday + timedelta(days=offset)


@dataclass
class StandardSession:
    name: str
    year: int
    blocks: list[TeachingBlock]

    def max_week(self) -> int:
        return max((b.week_end for b in self.blocks), default=0)

    def resolve(self, week_num: int, weekday_name: str) -> date | None:
        for block in self.blocks:
            d = block.resolve(week_num, weekday_name)
            if d is not None:
                return d
        return None


_WEEKS_RE = re.compile(r"weeks?\s*(\d+)\s*[\u2013\u2014-]\s*(\d+)", re.IGNORECASE)
_LECTURES_RE = re.compile(r"Lectures\s+(Commence|Recommence)", re.IGNORECASE)


def _label_to_name_year(label: str) -> tuple[str, int] | None:
    """'Autumn Session 2026' -> ('Autumn', 2026)
    'Trimester 1 2026' -> ('Trimester 1', 2026)
    'Summer Session 2026/2027' -> ('Summer', 2026)
    Anything else (Non-Standard / Offshore tab labels) -> None.
    """
    label = label.strip()
    m = re.match(r"^(.*?)\s+Session\s+(\d{4})(?:/\d{4})?$", label)
    if m:
        return m.group(1).strip(), int(m.group(2))
    m = re.match(r"^(Trimester\s+\d+)\s+(\d{4})$", label)
    if m:
        return m.group(1), int(m.group(2))
    return None


def fetch_standard_sessions(html: str) -> dict[tuple[str, int], StandardSession]:
    """Scrape every standard session tab for every year present on the page.

    The page structure: <ul class="uw-tabs tabs" id="tabs-XXXXXX"> holds
    <a href="#tab-YYYYY">Label</a> entries; the matching
    <div data-tabs-content="tabs-XXXXXX"> holds <div id="tab-YYYYY"> panels,
    each containing a two-column Activity/Date table.
    """
    soup = BeautifulSoup(html, "html.parser")
    sessions: dict[tuple[str, int], StandardSession] = {}

    for tabs_ul in soup.select("ul.uw-tabs.tabs"):
        tabs_id = tabs_ul.get("id", "")
        content = soup.select_one(f'div.tabs-content[data-tabs-content="{tabs_id}"]')
        if content is None:
            continue

        for a in tabs_ul.select("a[href^='#tab-']"):
            label = a.get_text(strip=True)
            name_year = _label_to_name_year(label)
            if name_year is None:
                continue  # Non-Standard / Offshore tabs land here; skip.

            tab_id = a["href"].lstrip("#")
            panel = content.find(id=tab_id)
            table = panel.find("table") if panel else None
            if table is None:
                continue

            blocks: list[TeachingBlock] = []
            for row in table.select("tbody tr"):
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue
                activity = cells[0].get_text(" ", strip=True)
                date_text = cells[1].get_text(" ", strip=True)

                if not _LECTURES_RE.search(activity):
                    continue
                date_range = parse_date_range(date_text)
                if date_range is None:
                    continue
                start, end = date_range

                wm = _WEEKS_RE.search(activity)
                if wm:
                    week_start, week_end = int(wm.group(1)), int(wm.group(2))
                else:
                    # No explicit week range (e.g. Trimester 1's plain
                    # "Lectures commence" row). Infer the count from the
                    # date span and continue numbering from the prior block.
                    count = round((end - start).days / 7) + 1
                    prior_max = max((b.week_end for b in blocks), default=0)
                    week_start, week_end = prior_max + 1, prior_max + count

                blocks.append(TeachingBlock(week_start, week_end, start))

            blocks.sort(key=lambda b: b.week_start)
            name, year = name_year
            sessions[(name, year)] = StandardSession(name, year, blocks)

    return sessions


# ── Non-standard sessions (PDF) ───────────────────────────────────────────────


@dataclass
class NonStandardSession:
    name: str
    start: date
    end: date


_NONSTANDARD_TAB_RE = re.compile(r"\d{4}\s+Non-Standard Sessions", re.IGNORECASE)
_PDF_ROW_RE = re.compile(
    r"^(.+?)\s+(\d{1,2}/\d{1,2}/\d{4})\s+(\d{1,2}/\d{1,2}/\d{4})\b"
)


def find_nonstandard_pdf_url(html: str) -> str:
    """Locate the non-standard sessions PDF link on the key dates page.

    Never hardcoded: the link text changes year to year (e.g. "View 2026
    non-standard session dates (pdf)") and so does the underlying URL.
    """
    soup = BeautifulSoup(html, "html.parser")

    for tabs_ul in soup.select("ul.uw-tabs.tabs"):
        tabs_id = tabs_ul.get("id", "")
        content = soup.select_one(f'div.tabs-content[data-tabs-content="{tabs_id}"]')
        if content is None:
            continue
        for a in tabs_ul.select("a[href^='#tab-']"):
            if not _NONSTANDARD_TAB_RE.search(a.get_text(strip=True)):
                continue
            tab_id = a["href"].lstrip("#")
            panel = content.find(id=tab_id)
            if panel is None:
                continue
            link = panel.find("a", href=re.compile(r"\.pdf$", re.IGNORECASE))
            if link:
                return link["href"]

    raise RuntimeError(
        "Could not locate the non-standard sessions PDF link on the key dates page."
    )


def _parse_ddmmyyyy(text: str) -> date:
    d, m, y = (int(x) for x in text.split("/"))
    return date(y, m, d)


def fetch_nonstandard_sessions(pdf_bytes: bytes) -> dict[str, NonStandardSession]:
    """Parse the 'Session Name / Start of Session / End of Session / ...'
    table out of the non-standard sessions PDF. Only the first two date
    columns are used; later columns (enrolment deadlines, results dates)
    aren't needed here.
    """
    import pdfplumber

    sessions: dict[str, NonStandardSession] = {}
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                m = _PDF_ROW_RE.match(line.strip())
                if not m:
                    continue
                name, start_text, end_text = m.groups()
                name = name.strip()
                if name.lower() == "session name":
                    continue
                try:
                    start = _parse_ddmmyyyy(start_text)
                    end = _parse_ddmmyyyy(end_text)
                except ValueError:
                    continue
                sessions[name] = NonStandardSession(name, start, end)

    return sessions


# ── Combined calendar ─────────────────────────────────────────────────────────

_MERGE_RE = re.compile(r"^(.+?)\s+(\d{4})/(.+?)\s+(\d{4})$")


class AcademicCalendar:
    """Combined view over standard + non-standard sessions.

    Handles SOLSS's combined session names (e.g. "Spring 2026/Autumn 2027")
    by merging the two underlying standard sessions: the first session's
    week numbers are used as-is, and the second session's week numbers are
    offset by the first session's highest week number, matching how UOW
    numbers these continuously across the pair.
    """

    def __init__(self):
        resp = requests.get(KEY_DATES_URL, timeout=30)
        resp.raise_for_status()
        html = resp.text

        self.standard = fetch_standard_sessions(html)

        pdf_url = find_nonstandard_pdf_url(html)
        pdf_resp = requests.get(pdf_url, timeout=60)
        pdf_resp.raise_for_status()
        self.nonstandard = fetch_nonstandard_sessions(pdf_resp.content)

        self._merge_cache: dict[str, StandardSession] = {}

    def _merge(self, session_name: str) -> StandardSession | None:
        m = _MERGE_RE.match(session_name.strip())
        if not m:
            return None
        name_a, year_a, name_b, year_b = m.groups()
        sess_a = self.standard.get((name_a.strip(), int(year_a)))
        sess_b = self.standard.get((name_b.strip(), int(year_b)))
        if sess_a is None or sess_b is None:
            return None

        offset = sess_a.max_week()
        merged_blocks = list(sess_a.blocks) + [
            TeachingBlock(b.week_start + offset, b.week_end + offset, b.date_start)
            for b in sess_b.blocks
        ]
        return StandardSession(session_name, sess_a.year, merged_blocks)

    @staticmethod
    def is_gsm(session_name: str) -> bool:
        return session_name.strip().upper().startswith("GSM")

    def resolve_week(
        self, session_name: str, year: int, week_num: int, weekday_name: str
    ) -> date | None:
        """Resolve (session, year, week number, weekday) -> actual date.

        Lookup order: exact standard-session match for the given year,
        then a slash-merged combined session, then a non-standard PDF
        session (week count inferred from its date span, no recess).
        """
        session_name = session_name.strip()

        direct = self.standard.get((session_name, year))
        if direct:
            return direct.resolve(week_num, weekday_name)

        if session_name not in self._merge_cache:
            merged = self._merge(session_name)
            if merged:
                self._merge_cache[session_name] = merged
        if session_name in self._merge_cache:
            return self._merge_cache[session_name].resolve(week_num, weekday_name)

        ns = self.nonstandard.get(session_name)
        if ns:
            count = round((ns.end - ns.start).days / 7) + 1
            block = TeachingBlock(1, count, ns.start)
            return block.resolve(week_num, weekday_name)

        return None

    def get_span(self, session_name: str, year: int) -> tuple[date, date] | None:
        """Start/end span for a session. Used by the GSM overlay pass,
        which marks every weekday occurrence across the full span busy
        (no week-number resolution attempted for GSM, since GSM's recess
        gaps shift unpredictably year to year)."""
        session_name = session_name.strip()

        ns = self.nonstandard.get(session_name)
        if ns:
            return ns.start, ns.end

        direct = self.standard.get((session_name, year))
        if direct and direct.blocks:
            return direct.blocks[0].date_start, direct.blocks[
                -1
            ].date_start + timedelta(days=6)

        if session_name not in self._merge_cache:
            merged = self._merge(session_name)
            if merged:
                self._merge_cache[session_name] = merged
        merged = self._merge_cache.get(session_name)
        if merged and merged.blocks:
            return merged.blocks[0].date_start, merged.blocks[
                -1
            ].date_start + timedelta(days=6)

        return None

    # ── Disk cache (avoids re-scraping key dates + PDF every full run) ───────

    def to_cache_dict(self) -> dict:
        return {
            "standard": {
                f"{name}|{year}": {
                    "name": sess.name,
                    "year": sess.year,
                    "blocks": [
                        {
                            "week_start": b.week_start,
                            "week_end": b.week_end,
                            "date_start": b.date_start.isoformat(),
                        }
                        for b in sess.blocks
                    ],
                }
                for (name, year), sess in self.standard.items()
            },
            "nonstandard": {
                name: {
                    "name": ns.name,
                    "start": ns.start.isoformat(),
                    "end": ns.end.isoformat(),
                }
                for name, ns in self.nonstandard.items()
            },
        }

    @classmethod
    def from_cache_dict(cls, data: dict) -> "AcademicCalendar":
        cal = cls.__new__(cls)
        cal._merge_cache = {}

        cal.standard = {}
        for key, payload in data.get("standard", {}).items():
            name, year_str = key.split("|", 1)
            blocks = [
                TeachingBlock(
                    b["week_start"],
                    b["week_end"],
                    date.fromisoformat(b["date_start"]),
                )
                for b in payload.get("blocks", [])
            ]
            cal.standard[(name, int(year_str))] = StandardSession(
                payload.get("name", name),
                int(payload.get("year", year_str)),
                blocks,
            )

        cal.nonstandard = {
            name: NonStandardSession(
                payload["name"],
                date.fromisoformat(payload["start"]),
                date.fromisoformat(payload["end"]),
            )
            for name, payload in data.get("nonstandard", {}).items()
        }
        return cal

    @classmethod
    def load_or_fetch(
        cls,
        cache_file: Path | None = None,
        max_age: timedelta = timedelta(days=7),
    ) -> "AcademicCalendar":
        """Return a calendar from disk cache when fresh, else scrape and save."""
        cache_file = cache_file or Path("public/cache/academic_calendar_cache.json")

        if cache_file.exists():
            try:
                envelope = json.loads(cache_file.read_text(encoding="utf-8"))
                cached_at = datetime.fromisoformat(envelope["cached_at"])
                if datetime.now() - cached_at <= max_age:
                    print(
                        f"  Using cached academic calendar "
                        f"(saved {cached_at.strftime('%d %b %Y')}, "
                        f"TTL {max_age.days}d)"
                    )
                    return cls.from_cache_dict(envelope["calendar"])
            except (KeyError, ValueError, json.JSONDecodeError) as exc:
                print(f"  Calendar cache unreadable ({exc}); re-scraping.")

        print("  Scraping key dates page + non-standard sessions PDF...")
        cal = cls()
        envelope = {
            "cached_at": datetime.now().isoformat(timespec="seconds"),
            "calendar": cal.to_cache_dict(),
        }
        cache_file.write_text(
            json.dumps(envelope, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"  Cached academic calendar -> {cache_file}")
        return cal

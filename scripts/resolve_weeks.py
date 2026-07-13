"""Expand a SOLSS 'week' field into a sorted list of actual calendar dates.

The 'week' field on a timetable entry comes in three shapes:
  - a range, e.g. "2-13"
  - a literal date, e.g. "20/04/2026" (some entries give exact dates
    instead of week numbers - taken as-is, no calendar lookup needed)
  - multiple of the above separated by ';' or ','

Single bare week numbers (e.g. "1") are also handled as a one-element range.
"""

from __future__ import annotations

import re
from datetime import date

from academic_calendar import AcademicCalendar

_LITERAL_DATE_RE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})$")
_RANGE_RE = re.compile(r"^(\d+)\s*-\s*(\d+)$")
_SINGLE_RE = re.compile(r"^(\d+)$")


def resolve_class_dates(
    week_field: str,
    session_name: str,
    session_year: int,
    weekday_name: str,
    calendar: AcademicCalendar,
) -> list[date]:
    """Every date this class meets on, given its SOLSS week spec.

    Week numbers that don't resolve (e.g. they fall outside every known
    teaching block, which would indicate stale/bad source data) are
    silently dropped rather than raising, so one bad subject doesn't kill
    the whole scrape.
    """
    dates: set[date] = set()
    if not week_field:
        return []

    for token in re.split(r"[;,]", week_field):
        token = token.strip()
        if not token:
            continue

        lit = _LITERAL_DATE_RE.match(token)
        if lit:
            d, m, y = (int(x) for x in lit.groups())
            dates.add(date(y, m, d))
            continue

        rng = _RANGE_RE.match(token)
        if rng:
            start_wk, end_wk = int(rng.group(1)), int(rng.group(2))
            for wk in range(start_wk, end_wk + 1):
                resolved = calendar.resolve_week(
                    session_name, session_year, wk, weekday_name
                )
                if resolved:
                    dates.add(resolved)
            continue

        single = _SINGLE_RE.match(token)
        if single:
            wk = int(single.group(1))
            resolved = calendar.resolve_week(
                session_name, session_year, wk, weekday_name
            )
            if resolved:
                dates.add(resolved)
            continue

        # Unrecognized token shape - skip rather than guess.

    return sorted(dates)

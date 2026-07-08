"""
Seed missing AU-Rooms rows from the UOW teaching-spaces CSV.

This is a one-off helper to backfill teaching-room metadata for rooms that
exist in the UOW catalogue CSV but are missing from the AU-Rooms table.

Rules:
- Keep `Name` as the timetable-style room identifier (e.g. "BE-G03").
- Set `Building`/`Campus` using the prefix/building mapping the app expects:
  BE -> 340 (Bega Valley), EU -> 320 (Eurobodalla), SU -> 380 (Sutherland),
  300/303 -> Shoalhaven, 233 -> Innovation Campus.
- If an image URL is a directory stub (ends with "/images/") or lacks an
  image extension, do NOT store it in the DB.
"""

from __future__ import annotations

import argparse
import csv
import sys
import traceback
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from postgrest.exceptions import APIError
from httpx import HTTPStatusError, RequestError

from db_connection import get_supabase_client
from scrape_timetable import clean_room_fragment

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = REPO_ROOT / "data" / "uow_teaching_spaces_complete.csv"

ROOMS_TABLE = "AU-Rooms"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

BUILDING_TO_CAMPUS: dict[str, str] = {
    "340": "Bega Valley",
    "320": "Eurobodalla",
    "360": "Southern Highlands",
    "380": "Sutherland",
    "300": "Shoalhaven",
    "303": "Shoalhaven",
    "233": "Innovation Campus",
}

SATELLITE_PREFIX_TO_BUILDING: dict[str, str] = {
    "BE": "340",
    "EU": "320",
    "SU": "380",
    "HI": "360",
}


def resolve_room_name(building: str, room: str) -> str:
    """
    Resolve a CSV row's (Building, Room) into the timetable room identifier
    used by AU-Timings and AU-Rooms Name.
    """
    building = (building or "").strip()
    room = (room or "").strip()
    if not room:
        return building

    # Liverpool teaching spaces: CSV uses LP_400-XXX; AU rooms use 400-XXX.
    if room.startswith("LP_400-"):
        room = room.replace("LP_400-", "400-", 1)

    # Bega/Euro/Sutherland/Southern Highlands: CSV Room already matches
    # timetable name fragments (e.g. BE-G03).
    if room.startswith(("BE-", "EU-", "SU-", "HI-")):
        return clean_room_fragment(room)

    # Generic case: join building + room with a hyphen.
    if room.startswith(f"{building}-"):
        return clean_room_fragment(room)
    return clean_room_fragment(f"{building}-{room}")


def parse_room_number(name: str) -> str:
    if "-" not in (name or ""):
        return ""
    return name.split("-", 1)[1].strip()


def is_valid_image_url(url: str | None) -> bool:
    if not url:
        return False
    cleaned = url.strip()
    if not cleaned:
        return False

    parsed = urlparse(cleaned)
    path = (parsed.path or "").lower().rstrip("/")
    if not path:
        return False
    # Directory stubs look like ".../theatres/images/" in the CSV.
    if path.endswith("/images"):
        return False

    ext = Path(path).suffix.lower()
    return ext in IMAGE_EXTENSIONS


def parse_capacity(raw: str | None) -> int | None:
    if raw is None:
        return None
    raw = raw.strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def building_and_campus_from_name(name: str) -> tuple[str, str]:
    """
    Determine the AU-Rooms `Building` value (string) and `Campus` value.

    The DB `Building` field uses numeric campus building codes for satellite
    campuses (BE->340 etc.), even though AU-Rooms Name begins with BE/EU/SU.
    """
    building_part = (name or "").split("-", 1)[0].strip()

    building = SATELLITE_PREFIX_TO_BUILDING.get(building_part, building_part)
    campus = BUILDING_TO_CAMPUS.get(building, "Wollongong")
    return building, campus


def fetch_db_room_names(supabase: Any) -> set[str]:
    resp = supabase.table(ROOMS_TABLE).select("Name").execute()
    return {x.get("Name") for x in (resp.data or []) if x.get("Name")}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed missing AU-Rooms rows from UOW teaching-spaces CSV."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Teaching spaces CSV (default: {DEFAULT_CSV})",
    )
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    try:
        supabase = get_supabase_client()
    except Exception as e:
        print(f"Supabase init failed: {e}", file=sys.stderr)
        return 1

    db_names = fetch_db_room_names(supabase)

    expected_missing = {
        "233-115",
        "233-G01",
        "300-UG26",
        "300-UG29",
        "303-TG30",
        "40-125",
        "BE-G03",
        "BE-G04",
        "BE-G10",
        "EU-G03",
        "EU-G05",
        "EU-G20",
        "SU-104",
    }
    targets = sorted([n for n in expected_missing if n not in db_names])
    if not targets:
        print("No expected missing rooms are absent from AU-Rooms.")
        return 0

    target_rows: dict[str, dict[str, Any]] = {}

    with args.csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {
            "Building",
            "Room",
            "Type",
            "Capacity",
            "Equipment_Tier",
            "Special_Features",
            "Similar_Venues",
            "Front_Image",
            "Rear_Image",
        }
        missing_cols = required - set(reader.fieldnames or [])
        if missing_cols:
            raise ValueError(
                f"CSV missing columns: {', '.join(sorted(missing_cols))}"
            )

        for row in reader:
            name = resolve_room_name(row["Building"], row["Room"])
            if name not in expected_missing:
                continue
            if name not in targets:
                continue

            target_rows[name] = {
                "Capacity": parse_capacity(row.get("Capacity")),
                "RoomType": empty_to_none(row.get("Type")),
                "EquipmentTier": empty_to_none(row.get("Equipment_Tier")),
                "SpecialFeatures": empty_to_none(row.get("Special_Features")),
                "SimilarVenues": empty_to_none(row.get("Similar_Venues")),
                "FrontImage": row.get("Front_Image").strip()
                if is_valid_image_url(row.get("Front_Image"))
                else None,
                "RearImage": row.get("Rear_Image").strip()
                if is_valid_image_url(row.get("Rear_Image"))
                else None,
            }

    for name in targets:
        if name not in target_rows:
            print(f"Missing CSV metadata for {name}", file=sys.stderr)
            return 1

    insert_rows: list[dict[str, Any]] = []
    for name in targets:
        building, campus = building_and_campus_from_name(name)
        insert_rows.append(
            {
                "Name": name,
                "Building": building,
                "RoomNumber": parse_room_number(name),
                "Campus": campus,
                **target_rows[name],
            }
        )

    print(f"Inserting {len(insert_rows)} missing rooms into '{ROOMS_TABLE}'...")
    try:
        res = supabase.table(ROOMS_TABLE).insert(insert_rows).execute()
        inserted = len(res.data or []) if hasattr(res, "data") else 0
        print(f"Inserted {inserted} rows.")
        return 0
    except (APIError, RequestError, HTTPStatusError) as err:
        print(f"Insert failed: {err}", file=sys.stderr)
        return 1
    except Exception as err:
        traceback.print_exc()
        print(f"Unexpected insert error: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())


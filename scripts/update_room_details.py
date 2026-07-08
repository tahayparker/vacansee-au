"""Enrich AU-Rooms from the UOW teaching-spaces CSV.

Stores UOW image URLs directly in the database (no local downloads).
Image URLs that are directory stubs (no file extension) are skipped.
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

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_CSV = REPO_ROOT / "data" / "uow_teaching_spaces_complete.csv"
ROOMS_TABLE = "AU-Rooms"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

try:
    supabase = get_supabase_client()
except ValueError as config_err:
    print(f"Configuration Error: {config_err}", file=sys.stderr)
    sys.exit(1)
except Exception as init_err:
    print(f"Unexpected error initializing Supabase client: {init_err}", file=sys.stderr)
    sys.exit(1)


def resolve_room_name(building: str, room: str) -> str:
    """Map CSV Building + Room columns to the timetable room Name."""
    building = building.strip()
    room = room.strip()
    if not room:
        return building
    if room.startswith(f"{building}-"):
        return room
    return f"{building}-{room}"


def is_valid_image_url(url: str | None) -> bool:
    if not url:
        return False
    cleaned = url.strip()
    if not cleaned:
        return False
    path = urlparse(cleaned).path.lower().rstrip("/")
    if not path or path.endswith("/images"):
        return False
    ext = Path(path).suffix.lower()
    return ext in IMAGE_EXTENSIONS


def parse_capacity(raw: str) -> int | None:
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


def read_teaching_spaces(csv_path: Path) -> list[dict[str, Any]]:
    if not csv_path.is_file():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    rows: list[dict[str, Any]] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
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
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing columns: {', '.join(sorted(missing))}")

        for row in reader:
            name = resolve_room_name(row["Building"], row["Room"])
            rows.append(
                {
                    "Name": name,
                    "Capacity": parse_capacity(row.get("Capacity", "")),
                    "RoomType": empty_to_none(row.get("Type")),
                    "EquipmentTier": empty_to_none(row.get("Equipment_Tier")),
                    "SpecialFeatures": empty_to_none(row.get("Special_Features")),
                    "SimilarVenues": empty_to_none(row.get("Similar_Venues")),
                    "FrontImageUrl": row.get("Front_Image", "").strip(),
                    "RearImageUrl": row.get("Rear_Image", "").strip(),
                }
            )
    return rows


def fetch_existing_rooms() -> dict[str, dict[str, Any]]:
    print(f"Fetching rooms from '{ROOMS_TABLE}'...")
    rooms_by_name: dict[str, dict[str, Any]] = {}
    try:
        response = (
            supabase.table(ROOMS_TABLE)
            .select("id, Name, Building, RoomNumber, Campus, Capacity")
            .execute()
        )
        for room in response.data or []:
            name = room.get("Name")
            if name:
                rooms_by_name[name] = room
        print(f"Found {len(rooms_by_name)} rooms in database.")
        return rooms_by_name
    except (APIError, RequestError, HTTPStatusError) as err:
        print(f"Error fetching rooms: {err}", file=sys.stderr)
        raise RuntimeError("Failed to fetch rooms.") from err


def build_update_payload(csv_row: dict[str, Any]) -> dict[str, Any] | None:
    payload: dict[str, Any] = {
        "Capacity": csv_row["Capacity"],
        "RoomType": csv_row["RoomType"],
        "EquipmentTier": csv_row["EquipmentTier"],
        "SpecialFeatures": csv_row["SpecialFeatures"],
        "SimilarVenues": csv_row["SimilarVenues"],
        "FrontImage": None,
        "RearImage": None,
    }

    if is_valid_image_url(csv_row["FrontImageUrl"]):
        payload["FrontImage"] = csv_row["FrontImageUrl"].strip()
    if is_valid_image_url(csv_row["RearImageUrl"]):
        payload["RearImage"] = csv_row["RearImageUrl"].strip()

    metadata_fields = (
        "Capacity",
        "RoomType",
        "EquipmentTier",
        "SpecialFeatures",
        "SimilarVenues",
        "FrontImage",
        "RearImage",
    )
    if any(payload[key] is not None for key in metadata_fields):
        return payload
    return None


def update_rooms(csv_path: Path) -> bool:
    csv_rows = read_teaching_spaces(csv_path)
    existing = fetch_existing_rooms()

    updated = 0
    skipped_missing = 0
    skipped_unchanged = 0

    for csv_row in csv_rows:
        name = csv_row["Name"]
        db_room = existing.get(name)
        if not db_room:
            skipped_missing += 1
            print(f"No DB match for CSV room '{name}' — skipping.")
            continue

        payload = build_update_payload(csv_row)
        if not payload:
            skipped_unchanged += 1
            continue

        try:
            supabase.table(ROOMS_TABLE).update(payload).eq("id", db_room["id"]).execute()
            updated += 1
            print(f"Updated {name}")
        except (APIError, RequestError, HTTPStatusError) as err:
            print(f"Failed to update {name}: {err}", file=sys.stderr)
            return False
        except Exception as err:
            print(f"Unexpected error updating {name}: {err}", file=sys.stderr)
            traceback.print_exc()
            return False

    print(
        f"\nDone. Updated {updated} rooms. "
        f"Skipped {skipped_missing} (not in DB), "
        f"{skipped_unchanged} (no applicable data)."
    )
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Enrich AU-Rooms from UOW teaching-spaces CSV."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Teaching spaces CSV (default: {DEFAULT_CSV})",
    )
    args = parser.parse_args()

    success = update_rooms(args.csv)
    sys.exit(0 if success else 1)

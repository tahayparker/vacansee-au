# \scripts\update_rooms.py
import argparse
import csv
import sys
import traceback
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from postgrest.exceptions import APIError
from httpx import RequestError, HTTPStatusError

from db_connection import get_supabase_client

SCRIPT_DIR = Path(__file__).parent
DEFAULT_CSV_PATH = SCRIPT_DIR.parent / "public" / "classes.csv"
ROOMS_TABLE = "AU-Rooms"

# Buildings/locations with no campus in the AU model.
NO_CAMPUS_BUILDINGS: Set[str] = {
    "Online",
    "Whitlam Leisure Centre",
    "Keira High School",
    "Liverpool Public School",
    "FMDS",
}

try:
    supabase = get_supabase_client()
except ValueError as config_err:
    print(f"Configuration Error: {config_err}", file=sys.stderr)
    sys.exit("Exiting due to missing Supabase configuration.")
except Exception as init_err:
    print(f"Unexpected error initializing Supabase client: {init_err}", file=sys.stderr)
    sys.exit("Exiting due to Supabase client initialization failure.")


def parse_room_name(name: str) -> Tuple[str, str]:
    """
    Split a timetable room identifier into building and room number.
    Before the first hyphen = building; after = room number.
    No hyphen means the whole value is the building (empty room number).
    """
    cleaned = name.strip()
    if "-" in cleaned:
        building, _, room_number = cleaned.partition("-")
        return building.strip(), room_number.strip()
    return cleaned, ""


TBA_ROOM = "0-00"


def resolve_room_campus(room_name: str, campus_counts: Counter[str]) -> Optional[str]:
    """Pick the canonical campus for a room from its timetable row counts."""
    building, _ = parse_room_name(room_name)
    if building in NO_CAMPUS_BUILDINGS or room_name == TBA_ROOM:
        return None
    if not campus_counts:
        return None

    physical = {
        campus: count
        for campus, count in campus_counts.items()
        if not campus.startswith("UOW Online")
    }
    pool = physical if physical else dict(campus_counts)

    # When a room is booked on Wollongong and another campus, the non-Wollongong
    # campus is the room's physical location (e.g. 233-G12 on Innovation Campus).
    non_wollongong = {
        campus: count for campus, count in pool.items() if campus != "Wollongong"
    }
    if non_wollongong:
        return max(non_wollongong.items(), key=lambda item: (item[1], item[0]))[0]

    return max(pool.items(), key=lambda item: (item[1], item[0]))[0]


def collect_rooms_from_csv(csv_path: Path) -> List[Dict[str, Any]]:
    """Read unique rooms from CSV with building, room number, and campus."""
    if not csv_path.is_file():
        raise FileNotFoundError(f"CSV file not found at {csv_path}")

    room_campus_counts: Dict[str, Counter[str]] = defaultdict(Counter)
    unique_names: Set[str] = set()
    total_rows = 0

    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if "Room" not in (reader.fieldnames or []):
            raise ValueError("CSV file must contain a 'Room' column.")
        if "Campus" not in (reader.fieldnames or []):
            raise ValueError("CSV file must contain a 'Campus' column.")

        for row in reader:
            total_rows += 1
            room_name = row.get("Room", "").strip()
            campus = row.get("Campus", "").strip()
            if not room_name:
                continue
            unique_names.add(room_name)
            if campus:
                room_campus_counts[room_name][campus] += 1

    rooms: List[Dict[str, Any]] = []
    for room_name in sorted(unique_names):
        building, room_number = parse_room_name(room_name)
        campus = resolve_room_campus(
            room_name, room_campus_counts.get(room_name, Counter())
        )
        rooms.append(
            {
                "Name": room_name,
                "Building": building,
                "RoomNumber": room_number,
                "Campus": campus,
                "Capacity": None,
            }
        )

    print(
        f"Prepared {len(rooms)} unique rooms from CSV " f"(out of {total_rows} rows)."
    )
    return rooms


def fetch_existing_room_names() -> Set[str]:
    print(f"Fetching existing room names from '{ROOMS_TABLE}' table...")
    existing_names: Set[str] = set()
    try:
        response = supabase.table(ROOMS_TABLE).select("Name").execute()
        if response.data:
            for room in response.data:
                if room.get("Name"):
                    existing_names.add(room["Name"])
            print(f"Found {len(existing_names)} existing rooms in the database.")
        else:
            print("No existing rooms found in the database.")
        return existing_names
    except (APIError, RequestError, HTTPStatusError) as db_err:
        print(
            f"Error fetching existing rooms: {type(db_err).__name__} - {db_err}",
            file=sys.stderr,
        )
    except Exception as e:
        print(f"Unexpected error fetching existing rooms: {e}", file=sys.stderr)
        traceback.print_exc()
    raise RuntimeError("Failed to fetch existing room names.")


def delete_all_rooms() -> bool:
    print(f"Attempting to delete all existing data from '{ROOMS_TABLE}' table...")
    try:
        delete_response = supabase.table(ROOMS_TABLE).delete().gt("id", -1).execute()
        deleted_count = (
            len(delete_response.data)
            if hasattr(delete_response, "data") and delete_response.data
            else "Unknown number of"
        )
        print(
            f"Successfully deleted {deleted_count} existing rows from '{ROOMS_TABLE}'."
        )
        return True
    except (APIError, RequestError, HTTPStatusError) as db_err:
        print(
            f"Error deleting data from '{ROOMS_TABLE}': {type(db_err).__name__} - {db_err}",
            file=sys.stderr,
        )
    except Exception as e:
        print(
            f"Unexpected error deleting data from '{ROOMS_TABLE}': {e}", file=sys.stderr
        )
        traceback.print_exc()
    return False


def find_new_rooms_from_csv(
    csv_path: Path, existing_names: Set[str]
) -> List[Dict[str, Any]]:
    print(f"Reading rooms from CSV: {csv_path}...")
    try:
        all_rooms = collect_rooms_from_csv(csv_path)
        new_rooms = [room for room in all_rooms if room["Name"] not in existing_names]
        print(f"Found {len(new_rooms)} new rooms to add.")
        return new_rooms
    except (FileNotFoundError, ValueError) as err:
        print(f"Error: {err}", file=sys.stderr)
    except Exception as e:
        print(
            f"An unexpected error occurred during CSV processing: {e}", file=sys.stderr
        )
        traceback.print_exc()
    return []


def reset_rooms_from_csv(csv_path: Path) -> bool:
    print(f"Resetting '{ROOMS_TABLE}' from CSV: {csv_path}...")
    try:
        rooms = collect_rooms_from_csv(csv_path)
        if not delete_all_rooms():
            return False
        return insert_rooms(rooms)
    except (FileNotFoundError, ValueError) as err:
        print(f"Error: {err}", file=sys.stderr)
    except Exception as e:
        print(f"Unexpected error during room reset: {e}", file=sys.stderr)
        traceback.print_exc()
    return False


def insert_rooms(rooms: List[Dict[str, Any]]) -> bool:
    if not rooms:
        print("No rooms to insert.")
        return True

    print(f"Attempting to insert {len(rooms)} rooms into '{ROOMS_TABLE}'...")
    try:
        batch_size = 100
        total_inserted = 0

        for i in range(0, len(rooms), batch_size):
            batch = rooms[i : i + batch_size]
            print(f"Inserting batch of {len(batch)} rooms...")
            res = supabase.table(ROOMS_TABLE).insert(batch).execute()
            inserted_count = len(res.data) if res.data else 0
            total_inserted += inserted_count

        print(f"Successfully inserted {total_inserted} rooms.")
        return True
    except (APIError, RequestError, HTTPStatusError) as db_err:
        print(
            f"Error inserting rooms: {type(db_err).__name__} - {db_err}",
            file=sys.stderr,
        )
    except Exception as e:
        print(f"Unexpected error inserting rooms: {e}", file=sys.stderr)
        traceback.print_exc()
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync AU-Rooms with timetable CSV.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete all rooms and repopulate from CSV (default: insert new rooms only).",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help=f"Path to classes CSV (default: {DEFAULT_CSV_PATH})",
    )
    args = parser.parse_args()

    print("Starting rooms update process...")
    final_success = False
    try:
        if args.reset:
            final_success = reset_rooms_from_csv(args.csv)
        else:
            existing_rooms = fetch_existing_room_names()
            new_room_data = find_new_rooms_from_csv(args.csv, existing_rooms)
            if new_room_data is not None:
                final_success = insert_rooms(new_room_data)
            else:
                print(
                    "Room update process failed during CSV processing.", file=sys.stderr
                )
    except (RuntimeError, Exception) as main_err:
        print(f"Script failed: {main_err}", file=sys.stderr)
    finally:
        print("Room update process completed.")

    if final_success:
        print("Room update script finished successfully.")
        sys.exit(0)

    print("Room update script finished with errors.", file=sys.stderr)
    sys.exit(1)

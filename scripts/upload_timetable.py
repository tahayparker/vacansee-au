import csv
import sys
import traceback
from pathlib import Path
from typing import List, Dict, Any  # Added type hints

# Third-party imports (adjust based on actual client if needed)
from postgrest.exceptions import APIError
from httpx import RequestError, HTTPStatusError

# Local imports
from db_connection import get_supabase_client

# --- Configuration ---
SCRIPT_DIR = Path(__file__).parent
# Assumes 'public' is one level up from 'scripts'
DEFAULT_CSV_PATH = SCRIPT_DIR.parent / "public" / "classes.csv"
TARGET_TABLE = "AU-Timings"
BATCH_SIZE = 500

# --- Supabase Client Initialization ---
try:
    # This uses the SERVICE_ROLE_KEY by default, bypassing RLS
    supabase = get_supabase_client()
except ValueError as config_err:
    print(f"Configuration Error: {config_err}", file=sys.stderr)
    sys.exit("Exiting due to missing Supabase configuration.")
except Exception as init_err:
    print(f"Unexpected error initializing Supabase client: {init_err}", file=sys.stderr)
    sys.exit("Exiting due to Supabase client initialization failure.")


# --- Functions ---
def delete_existing_timings() -> bool:
    """Deletes all existing rows from the target table using service key."""
    print(f"Attempting to delete all existing data from '{TARGET_TABLE}' table...")
    try:
        # Using '.gt("id", -1)' assumes 'id' is a non-null PK and targets all rows.
        # RLS is bypassed due to the service key.
        delete_response = supabase.table(TARGET_TABLE).delete().gt("id", -1).execute()
        deleted_count = (
            len(delete_response.data)
            if hasattr(delete_response, "data")
            else "Unknown number of"
        )
        print(
            f"Successfully deleted {deleted_count} existing rows from '{TARGET_TABLE}'."
        )
        return True

    except (APIError, RequestError, HTTPStatusError) as db_err:
        print(
            f"Error deleting data from '{TARGET_TABLE}': {type(db_err).__name__} - {db_err}",
            file=sys.stderr,
        )
    except Exception as e:
        print(
            f"Unexpected error deleting data from '{TARGET_TABLE}': {e}",
            file=sys.stderr,
        )
        traceback.print_exc()

    print("Upload process aborted due to deletion failure.", file=sys.stderr)
    return False


def insert_timings_from_csv(csv_path: Path) -> bool:
    """
    Reads the CSV and inserts data into the target table in batches.
    Returns True if the entire process completes without error, False otherwise.
    """
    print(f"Reading data from CSV: {csv_path}...")
    rows_to_insert: List[Dict[str, Any]] = []
    total_rows_in_csv = 0
    inserted_count = 0
    skipped_count = 0
    # --- Start of main try block ---
    try:
        if not csv_path.is_file():
            # Let the FileNotFoundError be caught below
            raise FileNotFoundError(f"CSV file not found at {csv_path}")

        with csv_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            # Core fields must be present and non-empty; Campus is optional metadata.
            required_headers = {
                "SubCode",
                "Class",
                "Day",
                "StartTime",
                "EndTime",
                "Room",
                "Date",
            }
            csv_headers = set(reader.fieldnames or [])

            if not required_headers.issubset(csv_headers):
                missing = required_headers - csv_headers
                # Let this ValueError be caught below
                raise ValueError(f"CSV file header mismatch. Missing: {missing}.")

            print(f"CSV Headers look good: {reader.fieldnames}")

            # --- Process Rows and Insert Loop ---
            for i, row in enumerate(reader):
                total_rows_in_csv += 1
                insert_dict = {
                    "SubCode": row.get("SubCode"),
                    "Class": row.get("Class"),
                    "Day": row.get("Day"),
                    "StartTime": row.get("StartTime"),
                    "EndTime": row.get("EndTime"),
                    "Room": row.get("Room"),
                    "Date": (row.get("Date") or ""),
                    "Campus": (row.get("Campus") or ""),
                }

                # Basic validation for non-empty required values
                if not all(insert_dict.get(h) for h in required_headers):
                    print(
                        f"Warning: Skipping CSV row {i+1} due to missing/empty "
                        f"required data: {row}"
                    )
                    skipped_count += 1
                    continue

                rows_to_insert.append(insert_dict)

                # Insert in batches
                if len(rows_to_insert) >= BATCH_SIZE:
                    print(f"Inserting batch of {len(rows_to_insert)} rows...")
                    # The actual insert operation happens here. If it fails,
                    # it will raise an exception caught by the outer except blocks.
                    response = (
                        supabase.table(TARGET_TABLE).insert(rows_to_insert).execute()
                    )
                    inserted_count += (
                        len(response.data) if hasattr(response, "data") else 0
                    )
                    rows_to_insert = []  # Clear batch

            # Insert any remaining rows after the loop
            if rows_to_insert:
                print(f"Inserting final batch of {len(rows_to_insert)} rows...")
                response = supabase.table(TARGET_TABLE).insert(rows_to_insert).execute()
                inserted_count += len(response.data) if hasattr(response, "data") else 0
            # --- End Process Rows and Insert Loop ---

        # If we reach here, the file reading, parsing, and all inserts were successful
        print("-" * 30)
        print("Upload Summary:")
        print(f"  Total rows read from CSV: {total_rows_in_csv}")
        print(f"  Rows skipped: {skipped_count}")
        print(f"  Rows successfully inserted: {inserted_count}")
        print("-" * 30)
        return True  # Indicate success

    # --- Simplified Exception Handling ---
    except FileNotFoundError as fnf_err:
        print(f"Error: {fnf_err}", file=sys.stderr)
    except (
        ValueError,
        csv.Error,
    ) as csv_proc_err:  # Catches header errors & CSV format errors
        print(f"Error processing CSV file: {csv_proc_err}", file=sys.stderr)
    except (
        APIError,
        RequestError,
        HTTPStatusError,
    ) as db_err:  # Catches DB/Network errors during insert
        print(
            f"Error during database insertion: {type(db_err).__name__} - {db_err}",
            file=sys.stderr,
        )
        traceback.print_exc()  # Show details for these potentially complex errors
    except Exception as e:  # Catch-all for any other unexpected errors
        print(f"An unexpected error occurred during upload: {e}", file=sys.stderr)
        traceback.print_exc()

    # If any exception occurred, we end up here
    print("Upload process failed due to an error.", file=sys.stderr)
    return False  # Indicate failure
    # --- End Simplified Exception Handling ---


if __name__ == "__main__":
    print("Starting timetable upload process...")
    # You can add argparse here if you want to specify the CSV file via command line
    csv_file_to_upload = DEFAULT_CSV_PATH

    # Step 1: Delete existing data
    if delete_existing_timings():
        # Step 2: Insert new data from CSV
        if insert_timings_from_csv(csv_file_to_upload):
            print("Upload script finished successfully.")
            sys.exit(0)  # Exit with success code
        else:
            # Insertion failed, error message already printed by insert_timings_from_csv
            sys.exit(1)  # Exit with error code
    else:
        # Deletion failed, error message already printed by delete_existing_timings
        sys.exit(1)  # Exit with error code

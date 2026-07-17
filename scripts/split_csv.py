"""
Split a large CSV into <=50 MiB chunks on row boundaries.

Default input: public/raw/raw_classes.csv
Default output: public/raw/raw_classes_001.csv, raw_classes_002.csv, ...

Each chunk includes the header row. Existing raw_classes_*.csv chunk files
in the output directory are removed before writing new ones.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DEFAULT_INPUT = SCRIPT_DIR.parent / "public" / "raw" / "raw_classes.csv"
DEFAULT_MAX_BYTES = 50 * 1024 * 1024  # 50 MiB


def clear_existing_chunks(output_dir: Path, stem: str) -> None:
    pattern = f"{stem}_[0-9][0-9][0-9].csv"
    for path in sorted(output_dir.glob(pattern)):
        path.unlink()
        print(f"Removed old chunk: {path}")


def split_csv(
    input_path: Path,
    output_dir: Path | None = None,
    max_bytes: int = DEFAULT_MAX_BYTES,
) -> list[Path]:
    if not input_path.is_file():
        raise FileNotFoundError(f"Input CSV not found: {input_path}")

    output_dir = output_dir or input_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = input_path.stem  # e.g. raw_classes

    clear_existing_chunks(output_dir, stem)

    with input_path.open("r", encoding="utf-8", newline="") as src:
        header = src.readline()
        if not header:
            raise ValueError(f"Input CSV is empty: {input_path}")

        header_bytes = header.encode("utf-8")
        if len(header_bytes) >= max_bytes:
            raise ValueError(
                f"Header alone ({len(header_bytes)} bytes) exceeds max chunk size "
                f"({max_bytes} bytes)"
            )

        written: list[Path] = []
        part = 0
        out = None
        current_size = 0

        def open_part() -> None:
            nonlocal part, out, current_size
            if out is not None:
                out.close()
            part += 1
            path = output_dir / f"{stem}_{part:03d}.csv"
            out = path.open("w", encoding="utf-8", newline="")
            out.write(header)
            current_size = len(header_bytes)
            written.append(path)

        open_part()
        assert out is not None

        for line in src:
            line_bytes = line.encode("utf-8")
            if current_size + len(line_bytes) > max_bytes and current_size > len(
                header_bytes
            ):
                open_part()
                assert out is not None
            out.write(line)
            current_size += len(line_bytes)

        if out is not None:
            out.close()

    return written


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Split a CSV into <=50 MiB chunks (row-aligned)."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Input CSV path (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory for chunk files (default: same dir as input)",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=DEFAULT_MAX_BYTES,
        help=f"Max chunk size in bytes (default: {DEFAULT_MAX_BYTES})",
    )
    args = parser.parse_args()

    try:
        paths = split_csv(args.input, args.output_dir, args.max_bytes)
    except (FileNotFoundError, ValueError) as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1

    total = sum(p.stat().st_size for p in paths)
    print(
        f"Split {args.input} ({args.input.stat().st_size} bytes) into "
        f"{len(paths)} chunk(s), {total} bytes total:"
    )
    for path in paths:
        print(f"  {path} ({path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

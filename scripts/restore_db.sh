#!/usr/bin/env bash
#
# Restore a Supabase `public` schema dump produced by the
# backup-database.yml workflow.
#
# The dump is a gzip-compressed plain-SQL pg_dump of the public schema
# only (--clean --if-exists). It DROPs and re-creates every object it
# owns, so running it is destructive: it will wipe whatever currently
# lives in the `public` schema and replace it with the backup.
#
# Usage:
#   scripts/restore_db.sh <path/to/backup.sql.gz> [CONNECTION_URL]
#
# CONNECTION_URL defaults to $DIRECT_URL. Use the *direct* (unpooled)
# Supabase URL — pgbouncer doesn't like the `DROP TABLE` storms a
# restore emits.
#
# Pre-flight:
#   - Confirms the dump file exists and is non-empty.
#   - Prints the dump header + row counts summary.
#   - Prompts for explicit confirmation before executing.
#
# Rollback plan if the restore itself fails:
#   Supabase daily "point in time" backup covers the last 7 days on the
#   free tier; use the Supabase dashboard -> Database -> Backups to
#   recover if this script leaves the DB in a broken state.

set -euo pipefail

BACKUP="${1:-}"
CONN="${2:-${DIRECT_URL:-}}"

if [[ -z "${BACKUP}" || ! -f "${BACKUP}" ]]; then
  echo "Usage: $0 <path/to/backup.sql.gz> [CONNECTION_URL]" >&2
  echo "  CONNECTION_URL defaults to \$DIRECT_URL" >&2
  exit 2
fi

if [[ -z "${CONN}" ]]; then
  echo "No connection URL provided and DIRECT_URL is not set in the env." >&2
  exit 2
fi

SIZE=$(wc -c < "${BACKUP}")
if (( SIZE < 1024 )); then
  echo "Backup file is suspiciously small (${SIZE} bytes). Aborting." >&2
  exit 1
fi

echo "=========================================================="
echo "Backup : ${BACKUP}"
echo "Size   : ${SIZE} bytes"
echo "Target : ${CONN%%@*}@[redacted]"
echo "=========================================================="
echo "Dump header (first 20 lines):"
gunzip -c "${BACKUP}" | head -n 20
echo "----------------------------------------------------------"
echo "Object summary:"
gunzip -c "${BACKUP}" | grep -E '^(CREATE TABLE|CREATE INDEX|CREATE SEQUENCE|COPY )' | sort | uniq -c | sort -rn | head -n 30 || true
echo "=========================================================="
echo ""
echo "This will DROP and re-create every object in the public schema"
echo "of the target database. Type 'restore' to proceed."
read -r CONFIRM
if [[ "${CONFIRM}" != "restore" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Applying restore…"
gunzip -c "${BACKUP}" | psql --single-transaction --set ON_ERROR_STOP=on "${CONN}"

echo ""
echo "Restore complete."

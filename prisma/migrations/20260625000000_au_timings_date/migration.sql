-- Replace Weeks/AndOr with a resolved calendar Date per class occurrence.
-- Safe on the shared Supabase project: only touches AU-Timings.

TRUNCATE "AU-Timings";

ALTER TABLE "AU-Timings" DROP COLUMN IF EXISTS "Weeks";
ALTER TABLE "AU-Timings" DROP COLUMN IF EXISTS "AndOr";
ALTER TABLE "AU-Timings" ADD COLUMN IF NOT EXISTS "Date" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "AU-Timings_Date_StartTime_EndTime_idx"
  ON "AU-Timings"("Date", "StartTime", "EndTime");

CREATE INDEX IF NOT EXISTS "AU-Timings_Date_Room_idx"
  ON "AU-Timings"("Date", "Room");

NOTIFY pgrst, 'reload schema';

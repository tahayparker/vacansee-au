-- Add Description column to AU-Timings.
-- Safe on the shared Supabase project: only touches AU-Timings.

ALTER TABLE "AU-Timings" ADD COLUMN IF NOT EXISTS "Description" TEXT NOT NULL DEFAULT '';

NOTIFY pgrst, 'reload schema';

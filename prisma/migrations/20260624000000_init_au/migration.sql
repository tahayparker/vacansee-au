-- vacansee-au shares a Supabase project with the Dubai app, so all tables are
-- namespaced with an "AU-" prefix to avoid colliding with the existing
-- "Rooms"/"Timings" tables. This migration only creates the AU-* tables and
-- never touches the Dubai-era tables.

-- CreateTable
CREATE TABLE "AU-Rooms" (
    "id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "ShortCode" TEXT NOT NULL,
    "Capacity" INTEGER,

    CONSTRAINT "AU-Rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AU-Timings" (
    "id" SERIAL NOT NULL,
    "SubCode" TEXT NOT NULL,
    "Class" TEXT NOT NULL,
    "Day" TEXT NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    "Room" TEXT NOT NULL,
    "Date" TEXT NOT NULL DEFAULT '',
    "Campus" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AU-Timings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AU-Rooms_ShortCode_idx" ON "AU-Rooms"("ShortCode");

-- CreateIndex
CREATE INDEX "AU-Rooms_Name_idx" ON "AU-Rooms"("Name");

-- CreateIndex
CREATE INDEX "AU-Timings_Day_StartTime_EndTime_idx" ON "AU-Timings"("Day", "StartTime", "EndTime");

-- CreateIndex
CREATE INDEX "AU-Timings_Room_idx" ON "AU-Timings"("Room");

-- CreateIndex
CREATE INDEX "AU-Timings_Day_idx" ON "AU-Timings"("Day");

-- CreateIndex
CREATE INDEX "AU-Timings_Campus_idx" ON "AU-Timings"("Campus");

CREATE INDEX "AU-Timings_Date_StartTime_EndTime_idx" ON "AU-Timings"("Date", "StartTime", "EndTime");

CREATE INDEX "AU-Timings_Date_Room_idx" ON "AU-Timings"("Date", "Room");

-- Supabase: the Python pipeline talks to PostgREST as `service_role`, so it
-- needs explicit table/sequence privileges (the Next.js app uses a direct
-- Prisma connection and does not rely on these grants). NOTIFY refreshes the
-- PostgREST schema cache so the new tables are visible to the API.
GRANT ALL PRIVILEGES ON TABLE "AU-Rooms" TO service_role;
GRANT ALL PRIVILEGES ON TABLE "AU-Timings" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "AU-Rooms_id_seq" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "AU-Timings_id_seq" TO service_role;
NOTIFY pgrst, 'reload schema';

-- Redesign AU-Rooms for UOW: building/room split, campus, no ShortCode.

DROP TABLE IF EXISTS "AU-Rooms";

CREATE TABLE "AU-Rooms" (
    "id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Building" TEXT NOT NULL,
    "RoomNumber" TEXT NOT NULL DEFAULT '',
    "Campus" TEXT,
    "Capacity" INTEGER,

    CONSTRAINT "AU-Rooms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AU-Rooms_Name_idx" ON "AU-Rooms"("Name");
CREATE INDEX "AU-Rooms_Building_idx" ON "AU-Rooms"("Building");
CREATE INDEX "AU-Rooms_Campus_idx" ON "AU-Rooms"("Campus");

GRANT ALL PRIVILEGES ON TABLE "AU-Rooms" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "AU-Rooms_id_seq" TO service_role;
NOTIFY pgrst, 'reload schema';

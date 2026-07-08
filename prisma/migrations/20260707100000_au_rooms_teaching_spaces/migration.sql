-- Teaching-space metadata from UOW LTC room catalogue (type, AV, images, etc.)

ALTER TABLE "AU-Rooms" ADD COLUMN IF NOT EXISTS "RoomType" TEXT;
ALTER TABLE "AU-Rooms" ADD COLUMN IF NOT EXISTS "EquipmentTier" TEXT;
ALTER TABLE "AU-Rooms" ADD COLUMN IF NOT EXISTS "SpecialFeatures" TEXT;
ALTER TABLE "AU-Rooms" ADD COLUMN IF NOT EXISTS "SimilarVenues" TEXT;
ALTER TABLE "AU-Rooms" ADD COLUMN IF NOT EXISTS "FrontImage" TEXT;
ALTER TABLE "AU-Rooms" ADD COLUMN IF NOT EXISTS "RearImage" TEXT;

NOTIFY pgrst, 'reload schema';

-- Add optional metadata for class photos captured from teacher mobile browsers.
ALTER TABLE "Attendance"
  ADD COLUMN "classPhotoTakenAt" TIMESTAMP(3),
  ADD COLUMN "classPhotoLatitude" DOUBLE PRECISION,
  ADD COLUMN "classPhotoLongitude" DOUBLE PRECISION,
  ADD COLUMN "classPhotoAccuracy" DOUBLE PRECISION;

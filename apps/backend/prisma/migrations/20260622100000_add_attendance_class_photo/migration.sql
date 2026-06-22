ALTER TABLE "Attendance"
  ADD COLUMN "classPhotoKey" TEXT,
  ADD COLUMN "classPhotoName" TEXT,
  ADD COLUMN "classPhotoMimeType" TEXT,
  ADD COLUMN "classPhotoSize" INTEGER,
  ADD COLUMN "classPhotoUploadedAt" TIMESTAMP(3);

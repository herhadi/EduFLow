ALTER TABLE "TeachingPlan"
ADD COLUMN "attachmentKey" TEXT,
ADD COLUMN "attachmentName" TEXT,
ADD COLUMN "attachmentMimeType" TEXT,
ADD COLUMN "attachmentSize" INTEGER,
ADD COLUMN "attachmentUploadedAt" TIMESTAMP(3);

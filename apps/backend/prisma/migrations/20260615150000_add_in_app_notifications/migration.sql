ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'IN_APP';

ALTER TABLE "NotificationLog"
ADD COLUMN "recipientUserId" UUID,
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "actionUrl" TEXT;

CREATE INDEX "NotificationLog_recipientUserId_readAt_createdAt_idx"
ON "NotificationLog"("recipientUserId", "readAt", "createdAt");

ALTER TABLE "NotificationLog"
ADD CONSTRAINT "NotificationLog_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

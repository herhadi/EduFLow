ALTER TABLE "User"
ADD COLUMN "photoKey" TEXT,
ADD COLUMN "photoName" TEXT,
ADD COLUMN "photoMimeType" TEXT,
ADD COLUMN "photoSize" INTEGER,
ADD COLUMN "telegramId" TEXT,
ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

CREATE TABLE "TelegramLinkToken" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramLinkToken_tokenHash_key" ON "TelegramLinkToken"("tokenHash");
CREATE INDEX "TelegramLinkToken_userId_expiresAt_idx" ON "TelegramLinkToken"("userId", "expiresAt");

UPDATE "User" AS "user"
SET
  "photoKey" = "teacher"."photoKey",
  "photoName" = "teacher"."photoName",
  "photoMimeType" = "teacher"."photoMimeType",
  "photoSize" = "teacher"."photoSize"
FROM "Teacher" AS "teacher"
WHERE "teacher"."userId" = "user"."id"
  AND "teacher"."photoKey" IS NOT NULL
  AND "user"."photoKey" IS NULL;

UPDATE "User" AS "user"
SET
  "telegramId" = "teacher"."telegramId",
  "telegramLinkedAt" = CURRENT_TIMESTAMP
FROM "Teacher" AS "teacher"
WHERE "teacher"."userId" = "user"."id"
  AND "teacher"."telegramId" IS NOT NULL
  AND "user"."telegramId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Teacher" AS "otherTeacher"
    WHERE "otherTeacher"."telegramId" = "teacher"."telegramId"
      AND "otherTeacher"."id" <> "teacher"."id"
  );

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

ALTER TABLE "TelegramLinkToken"
ADD CONSTRAINT "TelegramLinkToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

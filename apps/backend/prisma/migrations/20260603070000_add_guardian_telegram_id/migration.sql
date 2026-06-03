ALTER TABLE "Guardian" ADD COLUMN "telegramId" TEXT;
CREATE INDEX "Guardian_telegramId_idx" ON "Guardian"("telegramId");

ALTER TABLE "SchoolYear"
  ADD COLUMN "morningAssemblyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "morningAssemblyStartsAt" TEXT NOT NULL DEFAULT '06:50',
  ADD COLUMN "morningAssemblyEndsAt" TEXT NOT NULL DEFAULT '07:10';

CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

ALTER TABLE "Teacher"
  ADD COLUMN "nip" TEXT,
  ADD COLUMN "nuptk" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "telegramId" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Student"
  ADD COLUMN "nis" TEXT,
  ADD COLUMN "nisn" TEXT,
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Guardian"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Class"
  ADD COLUMN "homeroomTeacherId" UUID,
  ADD COLUMN "code" TEXT;

ALTER TABLE "Subject"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Schedule"
  ADD COLUMN "room" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Teacher_nip_key" ON "Teacher"("nip");
CREATE UNIQUE INDEX "Teacher_nuptk_key" ON "Teacher"("nuptk");
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");
CREATE INDEX "Teacher_phone_idx" ON "Teacher"("phone");
CREATE INDEX "Teacher_telegramId_idx" ON "Teacher"("telegramId");
CREATE INDEX "Teacher_isActive_idx" ON "Teacher"("isActive");

CREATE UNIQUE INDEX "Student_nis_key" ON "Student"("nis");
CREATE UNIQUE INDEX "Student_nisn_key" ON "Student"("nisn");
CREATE INDEX "Student_phone_idx" ON "Student"("phone");
CREATE INDEX "Student_isActive_idx" ON "Student"("isActive");

CREATE INDEX "Guardian_isActive_idx" ON "Guardian"("isActive");

CREATE UNIQUE INDEX "Class_schoolYearId_code_key" ON "Class"("schoolYearId", "code");
CREATE INDEX "Class_homeroomTeacherId_idx" ON "Class"("homeroomTeacherId");

CREATE INDEX "Schedule_isActive_idx" ON "Schedule"("isActive");

ALTER TABLE "Class" ADD CONSTRAINT "Class_homeroomTeacherId_fkey"
  FOREIGN KEY ("homeroomTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

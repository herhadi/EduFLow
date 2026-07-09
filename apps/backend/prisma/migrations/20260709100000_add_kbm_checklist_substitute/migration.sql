ALTER TABLE "DailyAgenda"
  ADD COLUMN "substituteTeacherId" UUID;

ALTER TABLE "Attendance"
  ADD COLUMN "teacherPresent" BOOLEAN,
  ADD COLUMN "studentAttendanceDone" BOOLEAN,
  ADD COLUMN "materialFilled" BOOLEAN,
  ADD COLUMN "classPhotoDone" BOOLEAN,
  ADD COLUMN "issueNotes" TEXT;

ALTER TABLE "DailyAgenda"
  ADD CONSTRAINT "DailyAgenda_substituteTeacherId_fkey"
  FOREIGN KEY ("substituteTeacherId") REFERENCES "Teacher"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DailyAgenda_substituteTeacherId_date_idx" ON "DailyAgenda"("substituteTeacherId", "date");

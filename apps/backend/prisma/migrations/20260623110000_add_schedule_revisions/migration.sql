CREATE TABLE "ScheduleRevision" (
  "id" UUID NOT NULL, "scheduleId" UUID NOT NULL, "semesterId" UUID NOT NULL,
  "effectiveFrom" DATE NOT NULL, "classId" UUID NOT NULL, "subjectId" UUID NOT NULL,
  "teacherId" UUID NOT NULL, "timeSlotId" UUID, "dayOfWeek" INTEGER NOT NULL,
  "startsAt" TEXT NOT NULL, "endsAt" TEXT NOT NULL, "room" TEXT, "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScheduleRevision_scheduleId_effectiveFrom_key" ON "ScheduleRevision"("scheduleId", "effectiveFrom");
CREATE INDEX "ScheduleRevision_semesterId_effectiveFrom_idx" ON "ScheduleRevision"("semesterId", "effectiveFrom");
ALTER TABLE "ScheduleRevision" ADD CONSTRAINT "ScheduleRevision_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleRevision" ADD CONSTRAINT "ScheduleRevision_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleRevision" ADD CONSTRAINT "ScheduleRevision_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleRevision" ADD CONSTRAINT "ScheduleRevision_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleRevision" ADD CONSTRAINT "ScheduleRevision_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleRevision" ADD CONSTRAINT "ScheduleRevision_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "AcademicTimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

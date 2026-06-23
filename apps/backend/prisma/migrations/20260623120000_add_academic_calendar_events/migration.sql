CREATE TYPE "AcademicCalendarEventType" AS ENUM ('HOLIDAY', 'EXAM', 'SCHOOL_ACTIVITY', 'NON_TEACHING_DAY', 'OTHER');

CREATE TABLE "AcademicCalendarEvent" (
  "id" UUID NOT NULL,
  "schoolYearId" UUID NOT NULL,
  "semesterId" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "AcademicCalendarEventType" NOT NULL,
  "startsAt" DATE NOT NULL,
  "endsAt" DATE NOT NULL,
  "blocksAgenda" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AcademicCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcademicCalendarEvent_schoolYearId_startsAt_endsAt_idx"
  ON "AcademicCalendarEvent"("schoolYearId", "startsAt", "endsAt");
CREATE INDEX "AcademicCalendarEvent_semesterId_idx" ON "AcademicCalendarEvent"("semesterId");
CREATE INDEX "AcademicCalendarEvent_blocksAgenda_idx" ON "AcademicCalendarEvent"("blocksAgenda");

ALTER TABLE "AcademicCalendarEvent"
  ADD CONSTRAINT "AcademicCalendarEvent_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicCalendarEvent"
  ADD CONSTRAINT "AcademicCalendarEvent_semesterId_fkey"
  FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

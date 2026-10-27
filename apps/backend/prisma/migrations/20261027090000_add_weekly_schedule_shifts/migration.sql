ALTER TABLE "AcademicCalendarEvent"
  ADD COLUMN "scheduleShiftFromDay" INTEGER,
  ADD COLUMN "scheduleShiftToDay" INTEGER;

ALTER TABLE "DailyAgenda"
  ADD COLUMN "effectivePeriodNumber" INTEGER,
  ADD COLUMN "effectiveStartsAt" TEXT,
  ADD COLUMN "effectiveEndsAt" TEXT;

CREATE INDEX "AcademicCalendarEvent_scheduleShiftFromDay_scheduleShiftToDay_idx"
  ON "AcademicCalendarEvent"("scheduleShiftFromDay", "scheduleShiftToDay");

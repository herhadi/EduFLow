-- Permit reusing a time-slot definition after the previous slot was soft-deleted.
DROP INDEX IF EXISTS "AcademicTimeSlot_schoolYearId_dayOfWeek_startsAt_endsAt_key";

CREATE UNIQUE INDEX "AcademicTimeSlot_active_period_key"
  ON "AcademicTimeSlot" ("schoolYearId", "dayOfWeek", "startsAt", "endsAt")
  WHERE "deletedAt" IS NULL;

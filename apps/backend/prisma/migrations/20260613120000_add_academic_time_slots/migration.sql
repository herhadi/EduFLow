CREATE TYPE "AcademicTimeSlotType" AS ENUM ('LESSON', 'BREAK', 'CEREMONY', 'EXERCISE', 'CO_CURRICULAR', 'RELIGIOUS', 'OTHER');

CREATE TABLE "AcademicTimeSlot" (
  "id" UUID NOT NULL,
  "schoolYearId" UUID NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "periodNumber" INTEGER,
  "name" TEXT NOT NULL,
  "type" "AcademicTimeSlotType" NOT NULL,
  "startsAt" TEXT NOT NULL,
  "endsAt" TEXT NOT NULL,
  "isAssignable" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AcademicTimeSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicTimeSlot_schoolYearId_dayOfWeek_startsAt_endsAt_key" ON "AcademicTimeSlot"("schoolYearId", "dayOfWeek", "startsAt", "endsAt");
CREATE INDEX "AcademicTimeSlot_schoolYearId_dayOfWeek_periodNumber_idx" ON "AcademicTimeSlot"("schoolYearId", "dayOfWeek", "periodNumber");
CREATE INDEX "AcademicTimeSlot_isActive_idx" ON "AcademicTimeSlot"("isActive");

ALTER TABLE "AcademicTimeSlot" ADD CONSTRAINT "AcademicTimeSlot_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Schedule" ADD COLUMN "timeSlotId" UUID;
CREATE INDEX "Schedule_timeSlotId_idx" ON "Schedule"("timeSlotId");
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "AcademicTimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

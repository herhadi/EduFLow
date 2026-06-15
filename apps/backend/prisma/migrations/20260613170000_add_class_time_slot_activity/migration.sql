CREATE TYPE "ClassTimeSlotActivityType" AS ENUM ('BREAK', 'RELIGIOUS');

CREATE TABLE "ClassTimeSlotActivity" (
  "id" UUID NOT NULL,
  "classId" UUID NOT NULL,
  "timeSlotId" UUID NOT NULL,
  "type" "ClassTimeSlotActivityType" NOT NULL DEFAULT 'BREAK',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassTimeSlotActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassTimeSlotActivity_classId_timeSlotId_key" ON "ClassTimeSlotActivity"("classId", "timeSlotId");
CREATE INDEX "ClassTimeSlotActivity_classId_idx" ON "ClassTimeSlotActivity"("classId");
CREATE INDEX "ClassTimeSlotActivity_timeSlotId_idx" ON "ClassTimeSlotActivity"("timeSlotId");
ALTER TABLE "ClassTimeSlotActivity" ADD CONSTRAINT "ClassTimeSlotActivity_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassTimeSlotActivity" ADD CONSTRAINT "ClassTimeSlotActivity_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "AcademicTimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

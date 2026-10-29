CREATE TYPE "ExtracurricularParticipationPolicy" AS ENUM ('OPTIONAL', 'MANDATORY_GRADE');
CREATE TYPE "ExtracurricularEnrollmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'COMPLETED');
CREATE TYPE "ExtracurricularEnrollmentType" AS ENUM ('MANDATORY', 'VOLUNTARY');
CREATE TYPE "ExtracurricularSessionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');
CREATE TYPE "ExtracurricularAttendanceStatus" AS ENUM ('PRESENT', 'SICK', 'EXCUSED', 'ABSENT');

CREATE TABLE "Extracurricular" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "schoolYearId" UUID NOT NULL, "name" TEXT NOT NULL,
  "code" TEXT, "category" TEXT NOT NULL DEFAULT 'LAINNYA', "description" TEXT,
  "participationPolicy" "ExtracurricularParticipationPolicy" NOT NULL DEFAULT 'OPTIONAL',
  "mandatoryGrades" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[], "quota" INTEGER, "location" TEXT,
  "scheduleNotes" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3), CONSTRAINT "Extracurricular_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExtracurricularAdvisor" (
  "extracurricularId" UUID NOT NULL, "teacherId" UUID NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtracurricularAdvisor_pkey" PRIMARY KEY ("extracurricularId","teacherId")
);
CREATE TABLE "ExtracurricularEnrollment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "extracurricularId" UUID NOT NULL, "studentId" UUID NOT NULL,
  "status" "ExtracurricularEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE', "enrollmentType" "ExtracurricularEnrollmentType" NOT NULL DEFAULT 'VOLUNTARY',
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ExtracurricularEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExtracurricularSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "extracurricularId" UUID NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3), "location" TEXT, "activityNotes" TEXT, "status" "ExtracurricularSessionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" UUID NOT NULL, "submittedByUserId" UUID, "submittedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ExtracurricularSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExtracurricularAttendance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sessionId" UUID NOT NULL, "studentId" UUID NOT NULL, "enrollmentId" UUID NOT NULL,
  "status" "ExtracurricularAttendanceStatus" NOT NULL DEFAULT 'PRESENT', "notes" TEXT, "markedByUserId" UUID,
  "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ExtracurricularAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Extracurricular_schoolYearId_name_key" ON "Extracurricular"("schoolYearId","name");
CREATE INDEX "Extracurricular_schoolYearId_isActive_idx" ON "Extracurricular"("schoolYearId","isActive");
CREATE INDEX "ExtracurricularAdvisor_teacherId_idx" ON "ExtracurricularAdvisor"("teacherId");
CREATE UNIQUE INDEX "ExtracurricularEnrollment_extracurricularId_studentId_key" ON "ExtracurricularEnrollment"("extracurricularId","studentId");
CREATE INDEX "ExtracurricularEnrollment_studentId_status_idx" ON "ExtracurricularEnrollment"("studentId","status");
CREATE INDEX "ExtracurricularSession_extracurricularId_startsAt_idx" ON "ExtracurricularSession"("extracurricularId","startsAt");
CREATE INDEX "ExtracurricularSession_status_idx" ON "ExtracurricularSession"("status");
CREATE UNIQUE INDEX "ExtracurricularAttendance_sessionId_studentId_key" ON "ExtracurricularAttendance"("sessionId","studentId");
CREATE INDEX "ExtracurricularAttendance_studentId_status_idx" ON "ExtracurricularAttendance"("studentId","status");
ALTER TABLE "Extracurricular" ADD CONSTRAINT "Extracurricular_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularAdvisor" ADD CONSTRAINT "ExtracurricularAdvisor_extracurricularId_fkey" FOREIGN KEY ("extracurricularId") REFERENCES "Extracurricular"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularAdvisor" ADD CONSTRAINT "ExtracurricularAdvisor_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularEnrollment" ADD CONSTRAINT "ExtracurricularEnrollment_extracurricularId_fkey" FOREIGN KEY ("extracurricularId") REFERENCES "Extracurricular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularEnrollment" ADD CONSTRAINT "ExtracurricularEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularSession" ADD CONSTRAINT "ExtracurricularSession_extracurricularId_fkey" FOREIGN KEY ("extracurricularId") REFERENCES "Extracurricular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularAttendance" ADD CONSTRAINT "ExtracurricularAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExtracurricularSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularAttendance" ADD CONSTRAINT "ExtracurricularAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtracurricularAttendance" ADD CONSTRAINT "ExtracurricularAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ExtracurricularEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

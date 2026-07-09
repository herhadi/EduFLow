CREATE TYPE "AssessmentType" AS ENUM (
  'DAILY_TASK',
  'QUIZ',
  'DAILY_TEST',
  'PRACTICE',
  'PROJECT',
  'PORTFOLIO',
  'OBSERVATION',
  'OTHER'
);

CREATE TYPE "AssessmentStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'LOCKED',
  'REVISION_REQUESTED'
);

CREATE TABLE "Assessment" (
  "id" UUID NOT NULL,
  "teacherId" UUID NOT NULL,
  "schoolYearId" UUID NOT NULL,
  "semesterId" UUID NOT NULL,
  "classId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "type" "AssessmentType" NOT NULL,
  "assessmentDate" DATE NOT NULL,
  "maxScore" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "submittedById" UUID,
  "lockedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentScore" (
  "id" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "score" DECIMAL(5,2),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssessmentScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assessment_teacherId_schoolYearId_semesterId_idx" ON "Assessment"("teacherId", "schoolYearId", "semesterId");
CREATE INDEX "Assessment_classId_subjectId_assessmentDate_idx" ON "Assessment"("classId", "subjectId", "assessmentDate");
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

CREATE UNIQUE INDEX "AssessmentScore_assessmentId_enrollmentId_key" ON "AssessmentScore"("assessmentId", "enrollmentId");
CREATE INDEX "AssessmentScore_studentId_idx" ON "AssessmentScore"("studentId");
CREATE INDEX "AssessmentScore_enrollmentId_idx" ON "AssessmentScore"("enrollmentId");

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_semesterId_fkey"
  FOREIGN KEY ("semesterId") REFERENCES "Semester"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentScore"
  ADD CONSTRAINT "AssessmentScore_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentScore"
  ADD CONSTRAINT "AssessmentScore_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssessmentScore"
  ADD CONSTRAINT "AssessmentScore_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

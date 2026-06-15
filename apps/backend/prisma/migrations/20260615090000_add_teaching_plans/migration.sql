CREATE TYPE "TeachingPlanType" AS ENUM ('ANNUAL_PROGRAM', 'SEMESTER_PROGRAM', 'KKTP', 'LESSON_PLAN', 'TEACHING_BOOK');
CREATE TYPE "TeachingPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'ARCHIVED');
CREATE TABLE "TeachingPlan" (
  "id" UUID NOT NULL, "teacherId" UUID NOT NULL, "subjectId" UUID NOT NULL,
  "schoolYearId" UUID NOT NULL, "semesterId" UUID, "type" "TeachingPlanType" NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT, "attachmentUrl" TEXT,
  "status" "TeachingPlanStatus" NOT NULL DEFAULT 'DRAFT', "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3), "reviewedById" UUID, "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3), CONSTRAINT "TeachingPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeachingPlan_teacherId_schoolYearId_semesterId_idx" ON "TeachingPlan"("teacherId", "schoolYearId", "semesterId");
CREATE INDEX "TeachingPlan_status_type_idx" ON "TeachingPlan"("status", "type");
CREATE INDEX "TeachingPlan_reviewedById_idx" ON "TeachingPlan"("reviewedById");
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

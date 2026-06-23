CREATE TYPE "TeacherAssignmentStatus" AS ENUM ('ACTIVE', 'RETIRED', 'TRANSFERRED', 'ON_LEAVE', 'INACTIVE');

CREATE TABLE "TeacherSchoolYearAssignment" (
  "id" UUID NOT NULL,
  "teacherId" UUID NOT NULL,
  "schoolYearId" UUID NOT NULL,
  "status" "TeacherAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherSchoolYearAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherSchoolYearAssignment_teacherId_schoolYearId_key" ON "TeacherSchoolYearAssignment"("teacherId", "schoolYearId");
CREATE INDEX "TeacherSchoolYearAssignment_schoolYearId_status_idx" ON "TeacherSchoolYearAssignment"("schoolYearId", "status");

CREATE TABLE "TeacherSchoolYearSubject" (
  "assignmentId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherSchoolYearSubject_pkey" PRIMARY KEY ("assignmentId", "subjectId")
);
CREATE INDEX "TeacherSchoolYearSubject_subjectId_idx" ON "TeacherSchoolYearSubject"("subjectId");

ALTER TABLE "TeacherSchoolYearAssignment" ADD CONSTRAINT "TeacherSchoolYearAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolYearAssignment" ADD CONSTRAINT "TeacherSchoolYearAssignment_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolYearSubject" ADD CONSTRAINT "TeacherSchoolYearSubject_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherSchoolYearAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolYearSubject" ADD CONSTRAINT "TeacherSchoolYearSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

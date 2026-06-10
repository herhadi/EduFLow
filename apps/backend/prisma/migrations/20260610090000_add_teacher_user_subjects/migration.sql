ALTER TABLE "Teacher"
ADD COLUMN "userId" UUID;

CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");
CREATE INDEX "Teacher_userId_idx" ON "Teacher"("userId");

ALTER TABLE "Teacher"
ADD CONSTRAINT "Teacher_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TeacherSubject" (
  "teacherId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("teacherId", "subjectId")
);

CREATE INDEX "TeacherSubject_subjectId_idx" ON "TeacherSubject"("subjectId");

ALTER TABLE "TeacherSubject"
ADD CONSTRAINT "TeacherSubject_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeacherSubject"
ADD CONSTRAINT "TeacherSubject_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "TeachingJournalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');
CREATE TABLE "TeachingJournal" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "agendaId" UUID NOT NULL, "teacherId" UUID NOT NULL,
"learningObjectives" TEXT, "material" TEXT NOT NULL, "learningActivities" TEXT, "learningOutcome" TEXT,
"reflection" TEXT, "issueNotes" TEXT, "status" "TeachingJournalStatus" NOT NULL DEFAULT 'DRAFT',
"submittedAt" TIMESTAMP(3), "lockedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TeachingJournal_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ClassJournalNote" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "classId" UUID NOT NULL, "date" DATE NOT NULL,
"authorTeacherId" UUID NOT NULL, "content" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ClassJournalNote_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TeachingJournal_agendaId_key" ON "TeachingJournal"("agendaId");
CREATE INDEX "TeachingJournal_teacherId_status_idx" ON "TeachingJournal"("teacherId", "status");
CREATE INDEX "ClassJournalNote_classId_date_idx" ON "ClassJournalNote"("classId", "date");
CREATE INDEX "ClassJournalNote_authorTeacherId_createdAt_idx" ON "ClassJournalNote"("authorTeacherId", "createdAt");
ALTER TABLE "TeachingJournal" ADD CONSTRAINT "TeachingJournal_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "DailyAgenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeachingJournal" ADD CONSTRAINT "TeachingJournal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassJournalNote" ADD CONSTRAINT "ClassJournalNote_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassJournalNote" ADD CONSTRAINT "ClassJournalNote_authorTeacherId_fkey" FOREIGN KEY ("authorTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key")
VALUES
  (gen_random_uuid(), 'teaching_journal.read_own'),
  (gen_random_uuid(), 'teaching_journal.manage_own'),
  (gen_random_uuid(), 'teaching_journal.read_school'),
  (gen_random_uuid(), 'class_journal.read_assigned'),
  (gen_random_uuid(), 'class_journal.read_school'),
  (gen_random_uuid(), 'class_journal_note.manage_assigned')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON (
  (role."name" IN ('guru', 'wali_kelas') AND permission."key" IN ('teaching_journal.read_own', 'teaching_journal.manage_own'))
  OR (role."name" = 'wali_kelas' AND permission."key" IN ('class_journal.read_assigned', 'class_journal_note.manage_assigned'))
  OR (role."name" IN ('operator_sekolah', 'kepala_sekolah') AND permission."key" IN ('teaching_journal.read_school', 'class_journal.read_school'))
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

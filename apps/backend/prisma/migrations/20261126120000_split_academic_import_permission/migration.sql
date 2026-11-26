-- TU may import teacher and student records, but does not own academic master data.
-- Reconcile journal permissions here as well so the read-only TU monitor and teacher journal workflows are available.
INSERT INTO "Permission" ("id", "key")
VALUES
  (gen_random_uuid(), 'academic.import.manage'),
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
  (role."name" = 'tu' AND permission."key" IN ('academic.import.manage', 'teaching_journal.read_school', 'class_journal.read_school'))
  OR (role."name" IN ('guru', 'wali_kelas') AND permission."key" IN ('teaching_journal.read_own', 'teaching_journal.manage_own'))
  OR (role."name" = 'wali_kelas' AND permission."key" IN ('class_journal.read_assigned', 'class_journal_note.manage_assigned'))
  OR (role."name" = 'kepala_sekolah' AND permission."key" IN ('teaching_journal.read_school', 'class_journal.read_school'))
  OR (role."name" = 'root' AND permission."key" IN (
    'academic.import.manage',
    'teaching_journal.read_own',
    'teaching_journal.manage_own',
    'teaching_journal.read_school',
    'class_journal.read_assigned',
    'class_journal.read_school',
    'class_journal_note.manage_assigned'
  ))
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DELETE FROM "RolePermission" rp
USING "Role" role, "Permission" permission
WHERE rp."roleId" = role."id"
  AND rp."permissionId" = permission."id"
  AND role."name" = 'tu'
  AND permission."key" = 'academic.manage';

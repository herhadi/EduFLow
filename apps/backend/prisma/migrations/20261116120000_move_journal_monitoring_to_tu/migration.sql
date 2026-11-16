INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" IN ('teaching_journal.read_school', 'class_journal.read_school')
WHERE role."name" = 'tu'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT "id" FROM "Role" WHERE "name" = 'operator_sekolah')
AND "permissionId" IN (
  SELECT "id" FROM "Permission"
  WHERE "key" IN ('teaching_journal.read_school', 'class_journal.read_school')
);

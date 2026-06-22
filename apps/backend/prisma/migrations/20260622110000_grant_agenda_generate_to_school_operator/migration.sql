INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
JOIN "Permission" AS permission ON permission."key" = 'agenda.generate'
WHERE role."name" = 'operator_sekolah'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

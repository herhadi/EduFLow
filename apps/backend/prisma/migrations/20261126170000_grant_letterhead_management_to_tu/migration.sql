-- TU mengelola kop surat sebagai bagian dari administrasi persuratan.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'correspondence.letterhead.manage'
WHERE r."name" = 'tu'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

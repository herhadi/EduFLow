-- Root adalah role teknis dengan akses penuh ke seluruh modul EduFlow.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'root'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

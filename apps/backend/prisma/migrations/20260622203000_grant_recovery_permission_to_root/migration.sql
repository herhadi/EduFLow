INSERT INTO "Permission" ("id", "key")
VALUES (gen_random_uuid(), 'system.recovery.manage')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'root'
  AND p."key" = 'system.recovery.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

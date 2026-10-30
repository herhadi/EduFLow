INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'admin', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'admin');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" IN (
  'auth.session.manage', 'notification.read', 'notification.manage',
  'reporting.read', 'reporting.manage', 'audit.read', 'user.manage',
  'system.recovery.manage'
)
WHERE role."name" = 'admin'
ON CONFLICT DO NOTHING;

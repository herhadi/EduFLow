-- Root is the technical owner role and receives every registered capability.
-- Reconciled in migration so production RBAC is corrected without requiring a manual seed run.
-- School admin receives only the technical school-level capabilities in the role guide.
INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'root', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'root');

INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'admin', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'admin');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" = 'root'
ON CONFLICT DO NOTHING;

DELETE FROM "RolePermission" rp
USING "Role" role, "Permission" permission
WHERE rp."roleId" = role."id"
  AND rp."permissionId" = permission."id"
  AND role."name" = 'admin'
  AND permission."key" NOT IN (
    'auth.session.manage',
    'notification.read',
    'notification.manage',
    'reporting.read',
    'reporting.manage',
    'audit.read',
    'user.manage',
    'system.recovery.manage'
  );

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" role
JOIN "Permission" permission ON permission."key" IN (
  'auth.session.manage',
  'notification.read',
  'notification.manage',
  'reporting.read',
  'reporting.manage',
  'audit.read',
  'user.manage',
  'system.recovery.manage'
)
WHERE role."name" = 'admin'
ON CONFLICT DO NOTHING;

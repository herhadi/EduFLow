-- Rename the existing school admin role without losing user assignments or permissions.
DO $$
DECLARE
  old_role_id UUID;
  new_role_id UUID;
BEGIN
  SELECT "id" INTO old_role_id FROM "Role" WHERE "name" = 'admin';
  SELECT "id" INTO new_role_id FROM "Role" WHERE "name" = 'super admin';

  IF old_role_id IS NOT NULL AND new_role_id IS NULL THEN
    UPDATE "Role" SET "name" = 'super admin', "updatedAt" = NOW()
    WHERE "id" = old_role_id;
  ELSIF old_role_id IS NOT NULL AND new_role_id IS NOT NULL THEN
    INSERT INTO "UserRole" ("userId", "roleId")
    SELECT "userId", new_role_id FROM "UserRole" WHERE "roleId" = old_role_id
    ON CONFLICT DO NOTHING;

    INSERT INTO "RolePermission" ("roleId", "permissionId")
    SELECT new_role_id, "permissionId" FROM "RolePermission" WHERE "roleId" = old_role_id
    ON CONFLICT DO NOTHING;

    DELETE FROM "RolePermission" WHERE "roleId" = old_role_id;
    DELETE FROM "UserRole" WHERE "roleId" = old_role_id;
    DELETE FROM "Role" WHERE "id" = old_role_id;
  END IF;
END $$;

INSERT INTO "Role" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'super admin', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'super admin');

-- Keep Super Admin limited to school-level technical capabilities.
DELETE FROM "RolePermission" rp
USING "Role" role, "Permission" permission
WHERE rp."roleId" = role."id"
  AND rp."permissionId" = permission."id"
  AND role."name" = 'super admin'
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
WHERE role."name" = 'super admin'
ON CONFLICT DO NOTHING;

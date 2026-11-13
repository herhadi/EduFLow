-- TU handles school administration data, not KBM calendar or schedule operations.
DELETE FROM "RolePermission" rp
USING "Role" role, "Permission" permission
WHERE rp."roleId" = role."id"
  AND rp."permissionId" = permission."id"
  AND role."name" = 'tu'
  AND permission."key" IN (
    'academic-calendar.read',
    'academic-calendar.manage',
    'schedule.read',
    'schedule.manage',
    'agenda.read',
    'agenda.generate',
    'attendance.read',
    'attendance.manage'
  );

DELETE FROM "RolePermission"
WHERE "roleId" IN (
  SELECT "id" FROM "Role" WHERE "name" <> 'root'
)
AND "permissionId" IN (
  SELECT "id" FROM "Permission" WHERE "key" = 'agenda.generate'
);

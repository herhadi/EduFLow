-- Kop surat dikelola TU; Opsek tidak lagi memiliki akses baca maupun ubah.
DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."name" = 'operator_sekolah'
  AND p."key" IN ('correspondence.letterhead.read', 'correspondence.letterhead.manage');

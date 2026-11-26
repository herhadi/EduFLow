ALTER TABLE "OutgoingLetter" ADD COLUMN "letterheadSnapshot" JSONB;
INSERT INTO "Permission" ("id", "key") VALUES (gen_random_uuid(), 'correspondence.letterhead.read'), (gen_random_uuid(), 'correspondence.letterhead.manage') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE (r."name" IN ('operator_sekolah', 'super_admin') AND p."key" IN ('correspondence.letterhead.read','correspondence.letterhead.manage')) OR (r."name" IN ('tu','kepala_sekolah') AND p."key" = 'correspondence.letterhead.read')
ON CONFLICT DO NOTHING;

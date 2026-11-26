CREATE TYPE "SignatureMode" AS ENUM ('MANUAL', 'TTE');
CREATE TYPE "OutgoingLetterStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'REVISION_REQUESTED', 'APPROVED');
CREATE TABLE "OutgoingLetter" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "subject" TEXT NOT NULL, "recipient" TEXT NOT NULL,
"letterDate" DATE NOT NULL, "body" TEXT NOT NULL, "status" "OutgoingLetterStatus" NOT NULL DEFAULT 'DRAFT', "signatureMode" "SignatureMode" NOT NULL DEFAULT 'MANUAL',
"letterNumber" TEXT, "createdById" UUID NOT NULL, "approvedById" UUID, "submittedAt" TIMESTAMPTZ(3),
"approvedAt" TIMESTAMPTZ(3), "revisionNote" TEXT, "approvalCode" TEXT, "contentHash" TEXT,
"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
CONSTRAINT "OutgoingLetter_pkey" PRIMARY KEY ("id"),
CONSTRAINT "OutgoingLetter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT "OutgoingLetter_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE);
CREATE UNIQUE INDEX "OutgoingLetter_letterNumber_key" ON "OutgoingLetter"("letterNumber");
CREATE UNIQUE INDEX "OutgoingLetter_approvalCode_key" ON "OutgoingLetter"("approvalCode");
CREATE INDEX "OutgoingLetter_status_createdAt_idx" ON "OutgoingLetter"("status", "createdAt");
CREATE INDEX "OutgoingLetter_createdById_createdAt_idx" ON "OutgoingLetter"("createdById", "createdAt");
CREATE INDEX "OutgoingLetter_approvedById_approvedAt_idx" ON "OutgoingLetter"("approvedById", "approvedAt");
CREATE TABLE "IncomingLetter" (
"id" UUID NOT NULL DEFAULT gen_random_uuid(), "referenceNumber" TEXT, "sender" TEXT NOT NULL, "subject" TEXT NOT NULL,
"letterDate" DATE, "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "notes" TEXT,
"archiveKey" TEXT, "archiveName" TEXT, "archiveMimeType" TEXT, "archiveSize" INTEGER,
"receivedById" UUID NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
CONSTRAINT "IncomingLetter_pkey" PRIMARY KEY ("id"),
CONSTRAINT "IncomingLetter_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "IncomingLetter_receivedAt_idx" ON "IncomingLetter"("receivedAt");
CREATE INDEX "IncomingLetter_referenceNumber_idx" ON "IncomingLetter"("referenceNumber");
INSERT INTO "Permission" ("id", "key") VALUES
(gen_random_uuid(), 'correspondence.read'), (gen_random_uuid(), 'correspondence.manage'), (gen_random_uuid(), 'correspondence.approve')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE (r."name" = 'tu' AND p."key" IN ('correspondence.read','correspondence.manage'))
OR (r."name" = 'kepala_sekolah' AND p."key" IN ('correspondence.read','correspondence.approve'))
ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId") SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p WHERE r."name" = 'root' AND p."key" IN ('correspondence.read','correspondence.manage','correspondence.approve') ON CONFLICT DO NOTHING;

INSERT INTO "Permission" ("id", "key") VALUES
(gen_random_uuid(), 'correspondence.config.manage')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'super_admin' AND p."key" = 'correspondence.config.manage'
ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'root' AND p."key" = 'correspondence.config.manage'
ON CONFLICT DO NOTHING;

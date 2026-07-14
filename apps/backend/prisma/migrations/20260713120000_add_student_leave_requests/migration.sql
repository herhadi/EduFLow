CREATE TYPE "StudentLeaveRequestType" AS ENUM ('SICK', 'EXCUSED');

CREATE TYPE "StudentLeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "StudentLeaveRequest" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "guardianId" UUID NOT NULL,
  "requestedById" UUID,
  "dateFrom" DATE NOT NULL,
  "dateTo" DATE NOT NULL,
  "type" "StudentLeaveRequestType" NOT NULL,
  "status" "StudentLeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "attachmentKey" TEXT,
  "attachmentName" TEXT,
  "attachmentMimeType" TEXT,
  "attachmentSize" INTEGER,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "StudentLeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentLeaveRequest_studentId_dateFrom_dateTo_idx" ON "StudentLeaveRequest"("studentId", "dateFrom", "dateTo");
CREATE INDEX "StudentLeaveRequest_guardianId_status_idx" ON "StudentLeaveRequest"("guardianId", "status");
CREATE INDEX "StudentLeaveRequest_requestedById_status_idx" ON "StudentLeaveRequest"("requestedById", "status");
CREATE INDEX "StudentLeaveRequest_status_createdAt_idx" ON "StudentLeaveRequest"("status", "createdAt");

ALTER TABLE "StudentLeaveRequest" ADD CONSTRAINT "StudentLeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLeaveRequest" ADD CONSTRAINT "StudentLeaveRequest_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLeaveRequest" ADD CONSTRAINT "StudentLeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentLeaveRequest" ADD CONSTRAINT "StudentLeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key")
VALUES
  (gen_random_uuid(), 'student-leave.read'),
  (gen_random_uuid(), 'student-leave.manage'),
  (gen_random_uuid(), 'student-leave.review')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
JOIN "Permission" AS permission ON permission."key" IN ('student-leave.read', 'student-leave.manage', 'student-leave.review')
WHERE role."name" IN ('root', 'operator_sekolah')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
JOIN "Permission" AS permission ON permission."key" IN ('student-leave.read', 'student-leave.review')
WHERE role."name" = 'wali_kelas'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
JOIN "Permission" AS permission ON permission."key" IN ('student-leave.read', 'student-leave.manage')
WHERE role."name" = 'orang_tua'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

BEGIN;

LOCK TABLE "User" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_approvedById_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_correctedById_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_lockedById_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_submittedById_fkey";
ALTER TABLE "LoginAudit" DROP CONSTRAINT "LoginAudit_userId_fkey";
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_receivedById_fkey";
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_userId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

ALTER TABLE "User" RENAME TO "User_reorder_backup";

CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "username" TEXT,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "passwordChangedAt" TIMESTAMP(3)
);

INSERT INTO "User" (
  "id", "username", "password", "name", "email", "createdAt",
  "updatedAt", "deletedAt", "failedLoginCount", "lockedUntil",
  "lastLoginAt", "passwordChangedAt"
)
SELECT
  "id", "username", "password", "name", "email", "createdAt",
  "updatedAt", "deletedAt", "failedLoginCount", "lockedUntil",
  "lastLoginAt", "passwordChangedAt"
FROM "User_reorder_backup";

DROP TABLE "User_reorder_backup";

ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoginAudit" ADD CONSTRAINT "LoginAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

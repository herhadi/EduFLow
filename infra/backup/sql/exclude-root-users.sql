BEGIN;

CREATE TEMP TABLE "ExportRootUser" ON COMMIT DROP AS
SELECT DISTINCT "User"."id", "User"."email"
FROM "User"
INNER JOIN "UserRole" ON "UserRole"."userId" = "User"."id"
INNER JOIN "Role" ON "Role"."id" = "UserRole"."roleId"
WHERE "Role"."name" = 'root';

DELETE FROM "RefreshToken"
WHERE "userId" IN (SELECT "id" FROM "ExportRootUser");

DELETE FROM "PasswordResetToken"
WHERE "userId" IN (SELECT "id" FROM "ExportRootUser");

DELETE FROM "LoginAudit"
WHERE
  "userId" IN (SELECT "id" FROM "ExportRootUser")
  OR "email" IN (SELECT "email" FROM "ExportRootUser");

DELETE FROM "AuditLog"
WHERE "userId" IN (SELECT "id" FROM "ExportRootUser");

DELETE FROM "NotificationLog"
WHERE
  "recipientUserId" IN (SELECT "id" FROM "ExportRootUser")
  OR "recipient" IN (SELECT "email" FROM "ExportRootUser");

UPDATE "Teacher"
SET "userId" = NULL
WHERE "userId" IN (SELECT "id" FROM "ExportRootUser");

UPDATE "TeachingPlan"
SET "reviewedById" = NULL
WHERE "reviewedById" IN (SELECT "id" FROM "ExportRootUser");

UPDATE "Attendance"
SET
  "submittedById" = CASE WHEN "submittedById" IN (SELECT "id" FROM "ExportRootUser") THEN NULL ELSE "submittedById" END,
  "approvedById" = CASE WHEN "approvedById" IN (SELECT "id" FROM "ExportRootUser") THEN NULL ELSE "approvedById" END,
  "correctedById" = CASE WHEN "correctedById" IN (SELECT "id" FROM "ExportRootUser") THEN NULL ELSE "correctedById" END,
  "lockedById" = CASE WHEN "lockedById" IN (SELECT "id" FROM "ExportRootUser") THEN NULL ELSE "lockedById" END
WHERE
  "submittedById" IN (SELECT "id" FROM "ExportRootUser")
  OR "approvedById" IN (SELECT "id" FROM "ExportRootUser")
  OR "correctedById" IN (SELECT "id" FROM "ExportRootUser")
  OR "lockedById" IN (SELECT "id" FROM "ExportRootUser");

UPDATE "Payment"
SET "receivedById" = NULL
WHERE "receivedById" IN (SELECT "id" FROM "ExportRootUser");

DELETE FROM "UserRole"
WHERE "userId" IN (SELECT "id" FROM "ExportRootUser");

DELETE FROM "User"
WHERE "id" IN (SELECT "id" FROM "ExportRootUser");

COMMIT;

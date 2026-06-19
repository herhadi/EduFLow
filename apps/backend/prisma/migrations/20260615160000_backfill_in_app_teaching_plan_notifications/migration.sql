INSERT INTO "NotificationLog" (
  "id", "channel", "status", "recipient", "recipientUserId", "recipientName",
  "subject", "message", "templateKey", "dedupeKey", "entityType", "entityId",
  "attempts", "sentAt", "actionUrl", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), 'IN_APP', 'SENT', u.email, u.id, u.name,
  'Perangkat ajar menunggu review',
  t.name || ' mengirim ' || tp.title || ' untuk direview.',
  'teaching-plan.submitted',
  'teaching-plan.submitted.' || tp.id || '.' || u.id,
  'TeachingPlan', tp.id, 1, CURRENT_TIMESTAMP, '/principal/review',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TeachingPlan" tp
JOIN "Teacher" t ON t.id = tp."teacherId"
CROSS JOIN "User" u
WHERE tp.status = 'SUBMITTED'
  AND tp."deletedAt" IS NULL
  AND u."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "UserRole" ur
    JOIN "Role" r ON r.id = ur."roleId"
    WHERE ur."userId" = u.id AND r.name = 'kepala_sekolah'
  )
ON CONFLICT ("dedupeKey") DO NOTHING;

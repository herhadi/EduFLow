-- Each school year always has an explicit odd and even semester. Existing years
-- receive missing rows; only semesters whose dates fall outside their school year
-- are corrected, preserving valid school-specific calendar adjustments.
INSERT INTO "Semester" (
  "id", "schoolYearId", "type", "startsAt", "endsAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  sy."id",
  semester."type"::"SemesterType",
  semester."startsAt",
  semester."endsAt",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "SchoolYear" sy
CROSS JOIN LATERAL (
  VALUES
    (
      'ODD',
      sy."startsAt",
      make_timestamp(EXTRACT(YEAR FROM sy."startsAt")::int, 12, 31, 23, 59, 59.999)
    ),
    (
      'EVEN',
      make_timestamp(EXTRACT(YEAR FROM sy."endsAt")::int, 1, 1, 0, 0, 0),
      sy."endsAt"
    )
) AS semester("type", "startsAt", "endsAt")
WHERE sy."deletedAt" IS NULL
ON CONFLICT ("schoolYearId", "type") DO NOTHING;

UPDATE "Semester" s
SET
  "startsAt" = CASE
    WHEN s."type" = 'ODD' THEN sy."startsAt"
    ELSE make_timestamp(EXTRACT(YEAR FROM sy."endsAt")::int, 1, 1, 0, 0, 0)
  END,
  "endsAt" = CASE
    WHEN s."type" = 'ODD' THEN make_timestamp(EXTRACT(YEAR FROM sy."startsAt")::int, 12, 31, 23, 59, 59.999)
    ELSE sy."endsAt"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "SchoolYear" sy
WHERE s."schoolYearId" = sy."id"
  AND sy."deletedAt" IS NULL
  AND (s."startsAt" < sy."startsAt" OR s."endsAt" > sy."endsAt");

-- Preserve all existing academic relations by renaming the current populated year.
-- A separate 2026/2027 record is then created without semesters or academic data.
DO $$
DECLARE
  source_school_year_id UUID;
  target_school_year_id UUID;
BEGIN
  SELECT "id"
  INTO source_school_year_id
  FROM "SchoolYear"
  WHERE "name" = '2026/2027' AND "deletedAt" IS NULL;

  SELECT "id"
  INTO target_school_year_id
  FROM "SchoolYear"
  WHERE "name" = '2025/2026' AND "deletedAt" IS NULL;

  IF source_school_year_id IS NOT NULL AND target_school_year_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot move academic data: both 2025/2026 and 2026/2027 already exist. Reconcile the records manually before applying this migration.';
  END IF;

  IF source_school_year_id IS NOT NULL THEN
    UPDATE "SchoolYear"
    SET
      "name" = '2025/2026',
      "startsAt" = TIMESTAMPTZ '2025-07-01 00:00:00+00',
      "endsAt" = TIMESTAMPTZ '2026-06-30 23:59:59.999+00',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = source_school_year_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "SchoolYear"
    WHERE "name" = '2025/2026' AND "deletedAt" IS NULL
  ) THEN
    INSERT INTO "SchoolYear" ("id", "name", "startsAt", "endsAt", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      '2025/2026',
      TIMESTAMPTZ '2025-07-01 00:00:00+00',
      TIMESTAMPTZ '2026-06-30 23:59:59.999+00',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "SchoolYear"
    WHERE "name" = '2026/2027' AND "deletedAt" IS NULL
  ) THEN
    INSERT INTO "SchoolYear" ("id", "name", "startsAt", "endsAt", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      '2026/2027',
      TIMESTAMPTZ '2026-07-01 00:00:00+00',
      TIMESTAMPTZ '2027-06-30 23:59:59.999+00',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;

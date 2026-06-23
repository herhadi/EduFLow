-- Move all academic and finance transactions from the not-yet-started 2026/2027
-- year into 2025/2026. When 2025/2026 does not exist, renaming the source keeps
-- every relation intact. When it already exists but is empty, update each direct
-- foreign key while retaining 2026/2027 as the empty year for new configuration.
DO $$
DECLARE
  source_school_year_id UUID;
  target_school_year_id UUID;
  target_has_data BOOLEAN;
BEGIN
  SELECT "id"
  INTO source_school_year_id
  FROM "SchoolYear"
  WHERE "name" = '2026/2027' AND "deletedAt" IS NULL;

  SELECT "id"
  INTO target_school_year_id
  FROM "SchoolYear"
  WHERE "name" = '2025/2026' AND "deletedAt" IS NULL;

  IF source_school_year_id IS NOT NULL AND target_school_year_id IS NULL THEN
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

  IF source_school_year_id IS NOT NULL AND target_school_year_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM "AcademicTimeSlot" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "Semester" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "Class" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "StudentEnrollment" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "Schedule" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "DailyAgenda" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "TeachingPlan" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "FeeType" WHERE "schoolYearId" = target_school_year_id
      UNION ALL SELECT 1 FROM "Invoice" WHERE "schoolYearId" = target_school_year_id
    ) INTO target_has_data;

    IF target_has_data THEN
      RAISE EXCEPTION
        'Cannot move 2026/2027 data because 2025/2026 already has transactions. Reconcile the records manually before applying this migration.';
    END IF;

    UPDATE "AcademicTimeSlot" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "Semester" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "Class" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "StudentEnrollment" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "Schedule" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "DailyAgenda" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "TeachingPlan" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "FeeType" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
    UPDATE "Invoice" SET "schoolYearId" = target_school_year_id WHERE "schoolYearId" = source_school_year_id;
  END IF;
END $$;

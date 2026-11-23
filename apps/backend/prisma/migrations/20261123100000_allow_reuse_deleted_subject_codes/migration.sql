-- Allow reusing a subject code after its previous subject was soft-deleted.
DROP INDEX IF EXISTS "Subject_code_key";

CREATE UNIQUE INDEX "Subject_code_active_key"
  ON "Subject" ("code")
  WHERE "deletedAt" IS NULL AND "code" IS NOT NULL;

CREATE TYPE "TeachingPlanRevisionPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

ALTER TABLE "TeachingPlan"
  ADD COLUMN "reviewSection" TEXT,
  ADD COLUMN "reviewPriority" "TeachingPlanRevisionPriority";

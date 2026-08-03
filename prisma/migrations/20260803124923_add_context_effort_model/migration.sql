-- AlterTable
ALTER TABLE "Run" ADD COLUMN "contextTier" TEXT;
ALTER TABLE "Run" ADD COLUMN "model" TEXT;
ALTER TABLE "Run" ADD COLUMN "reasoningEffort" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "contextTier" TEXT;
ALTER TABLE "Task" ADD COLUMN "reasoningEffort" TEXT;

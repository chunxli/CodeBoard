-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "agent" TEXT,
    "model" TEXT,
    "contextTier" TEXT,
    "reasoningEffort" TEXT,
    "permissionMode" TEXT NOT NULL DEFAULT 'default',
    "outputFormat" TEXT NOT NULL DEFAULT 'text',
    "triggerType" TEXT NOT NULL,
    "cronExpression" TEXT,
    "webhookEvents" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "useSafeBranch" BOOLEAN NOT NULL DEFAULT true,
    "waitForPreviousRuns" BOOLEAN NOT NULL DEFAULT false,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 1800,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("agent", "contextTier", "createdAt", "cronExpression", "enabled", "id", "model", "name", "outputFormat", "permissionMode", "prompt", "reasoningEffort", "repoId", "timeoutSeconds", "triggerType", "updatedAt", "useSafeBranch", "webhookEvents") SELECT "agent", "contextTier", "createdAt", "cronExpression", "enabled", "id", "model", "name", "outputFormat", "permissionMode", "prompt", "reasoningEffort", "repoId", "timeoutSeconds", "triggerType", "updatedAt", "useSafeBranch", "webhookEvents" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_repoId_idx" ON "Task"("repoId");
CREATE INDEX "Task_triggerType_enabled_idx" ON "Task"("triggerType", "enabled");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to drop the column `secretHash` on the `WebhookConfig` table. All the data in the column will be lost.
  - Added the required column `secret` to the `WebhookConfig` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WebhookConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookConfig_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WebhookConfig" ("createdAt", "id", "repoId") SELECT "createdAt", "id", "repoId" FROM "WebhookConfig";
DROP TABLE "WebhookConfig";
ALTER TABLE "new_WebhookConfig" RENAME TO "WebhookConfig";
CREATE UNIQUE INDEX "WebhookConfig_repoId_key" ON "WebhookConfig"("repoId");
CREATE INDEX "WebhookConfig_repoId_idx" ON "WebhookConfig"("repoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "agent" TEXT,
    "model" TEXT,
    "permissionMode" TEXT NOT NULL DEFAULT 'default',
    "triggerType" TEXT NOT NULL,
    "cronExpression" TEXT,
    "webhookEvents" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "useSafeBranch" BOOLEAN NOT NULL DEFAULT true,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 1800,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trigger" TEXT NOT NULL,
    "branchName" TEXT,
    "logPath" TEXT,
    "exitCode" INTEGER,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Run_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookConfig_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Repo_sourceType_location_key" ON "Repo"("sourceType", "location");

-- CreateIndex
CREATE INDEX "Task_repoId_idx" ON "Task"("repoId");

-- CreateIndex
CREATE INDEX "Run_taskId_idx" ON "Run"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "WebhookConfig_repoId_idx" ON "WebhookConfig"("repoId");

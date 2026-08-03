import { hostname } from "node:os";
import { prisma } from "@/lib/prisma";
import { resolveRepoWorkdir, syncRepoToDefaultBranch } from "@/lib/repo-workdir";
import { createSafeBranch, isGitRepo } from "@/lib/git-safety";
import { startCopilotRun, type RunPermissionMode, type RunOutputFormat } from "@/lib/copilot-runner";
import type { RunTrigger } from "@/generated/prisma/client";

/** Creates the PENDING Run row up-front so callers can return its id immediately. */
export async function createPendingRun(taskId: string, trigger: RunTrigger) {
  return prisma.run.create({ data: { taskId, trigger, status: "PENDING" } });
}

/**
 * Executes a previously-created PENDING Run: resolves the repo, optionally creates a
 * safety branch, invokes the Copilot CLI, and persists the Run's outcome.
 * Intended to be called from inside the job queue (one at a time / bounded concurrency).
 */
export async function executeRun(runId: string): Promise<void> {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: { task: { include: { repo: true } } },
  });
  const task = run.task;

  // The run may have been cancelled while still queued (before it ever started).
  if (run.status === "CANCELLED") return;

  try {
    const repoPath = await resolveRepoWorkdir(task.repo);
    await syncRepoToDefaultBranch(task.repo, repoPath);
    let branchName: string | null = null;

    if (task.useSafeBranch && (await isGitRepo(repoPath))) {
      branchName = await createSafeBranch(repoPath, run.id, task.repo.defaultBranch);
    }

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "RUNNING",
        branchName,
        startedAt: new Date(),
        outputFormat: task.outputFormat,
        hostname: hostname(),
      },
    });

    const permissionMode: RunPermissionMode = task.permissionMode === "full" ? "full" : "default";
    const outputFormat: RunOutputFormat = task.outputFormat === "json" ? "json" : "text";

    const result = await startCopilotRun({
      runId: run.id,
      repoPath,
      prompt: task.prompt,
      agent: task.agent,
      model: task.model,
      permissionMode,
      outputFormat,
      timeoutSeconds: task.timeoutSeconds,
      onSpawn: ({ pid, command }) => {
        void prisma.run.update({ where: { id: run.id }, data: { pid, command } }).catch(() => {});
      },
    });

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: result.cancelled
          ? "CANCELLED"
          : result.timedOut
            ? "TIMED_OUT"
            : result.exitCode === 0
              ? "SUCCESS"
              : "FAILED",
        exitCode: result.exitCode,
        logPath: result.logPath,
        finishedAt: new Date(),
        cpuTimeMs: result.cpuTimeMs,
        peakMemoryMb: result.peakMemoryMb,
      },
    });
  } catch (err) {
    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      },
    });
  }
}

/** Convenience helper for callers that don't need the run id ahead of time. */
export async function executeTaskRun(taskId: string, trigger: RunTrigger): Promise<string> {
  const run = await createPendingRun(taskId, trigger);
  await executeRun(run.id);
  return run.id;
}

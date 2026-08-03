import { spawn } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { resolveRepoWorkdir } from "@/lib/repo-workdir";
import type { Repo, RunStatus } from "@/generated/prisma/client";

function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

/** Creates and checks out a fresh branch off the given base ref (the repo's default branch) so a run never edits it directly. */
export async function createSafeBranch(repoPath: string, runId: string, baseRef: string): Promise<string> {
  const branchName = `codeboard/run-${runId}`;
  const result = await runGit(["checkout", "-b", branchName, baseRef], repoPath);
  if (result.code !== 0) {
    throw new Error(`Failed to create branch ${branchName}: ${result.stderr}`);
  }
  return branchName;
}

/** Returns a unified diff of all changes made on the branch relative to the given base ref. */
export async function getBranchDiff(repoPath: string, baseRef: string): Promise<string> {
  const result = await runGit(["diff", baseRef], repoPath);
  return result.stdout;
}

/** Checks out an existing branch (does not create it). */
export async function checkoutBranch(repoPath: string, branchName: string): Promise<void> {
  const result = await runGit(["checkout", branchName], repoPath);
  if (result.code !== 0) {
    throw new Error(`Failed to checkout branch ${branchName}: ${result.stderr}`);
  }
}

/**
 * Computes a run's diff against its repo's default branch, checking out that run's own
 * branch first (a shared repo workdir may currently sit on a different run's branch).
 * Skips (returns "") if another run on the same repo is currently active, since switching
 * branches out from under it would corrupt its live working tree.
 */
export async function getRunDiff(run: {
  status: RunStatus;
  branchName: string | null;
  task: { repoId: string; repo: Repo };
}): Promise<string> {
  if (!run.branchName) return "";
  try {
    const repoPath = await resolveRepoWorkdir(run.task.repo);
    if (run.status !== "RUNNING" && run.status !== "PENDING") {
      const activeRun = await prisma.run.findFirst({
        where: { task: { repoId: run.task.repoId }, status: { in: ["RUNNING", "PENDING"] } },
      });
      if (activeRun) return "";
      await checkoutBranch(repoPath, run.branchName);
    }
    return await getBranchDiff(repoPath, run.task.repo.defaultBranch);
  } catch {
    return "";
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  const result = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  return result.stdout.trim();
}

export async function isGitRepo(repoPath: string): Promise<boolean> {
  const result = await runGit(["rev-parse", "--is-inside-work-tree"], repoPath);
  return result.code === 0;
}

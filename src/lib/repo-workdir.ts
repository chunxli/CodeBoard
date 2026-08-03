import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import type { Repo } from "@/generated/prisma/client";

export const CLONE_ROOT = path.join(process.cwd(), "data", "repos");

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the working directory a task should run in: the repo's local path as-is
 * (cloning it first under data/repos/<repoId> if it's a GIT_URL repo that hasn't been
 * cloned yet). Read-only otherwise — does NOT switch branches or pull, so it's safe to
 * call from pages/routes that just need the path to read a diff from a finished run.
 * Call `syncRepoToDefaultBranch` separately before starting a new run.
 */
export async function resolveRepoWorkdir(repo: Repo): Promise<string> {
  if (repo.sourceType === "LOCAL_PATH") {
    if (!(await pathExists(repo.location))) {
      throw new Error(`Local repo path does not exist: ${repo.location}`);
    }
    return repo.location;
  }

  await mkdir(CLONE_ROOT, { recursive: true });
  const workdir = path.join(CLONE_ROOT, repo.id);

  if (await pathExists(path.join(workdir, ".git"))) {
    return workdir;
  }

  const clone = await run("git", ["clone", "--branch", repo.defaultBranch, repo.location, workdir], CLONE_ROOT);
  if (clone.code !== 0) throw new Error(`git clone failed: ${clone.stderr}`);
  return workdir;
}

/**
 * Brings a repo's workdir up to date with its default branch before a run starts:
 * checks out the default branch (discarding any leftover safe branch from a previous
 * run) and fast-forwards it to the remote tip. Throws (failing the run) if it can't.
 */
export async function syncRepoToDefaultBranch(repo: Repo, workdir: string): Promise<void> {
  if (repo.sourceType === "LOCAL_PATH") {
    const checkout = await run("git", ["checkout", repo.defaultBranch], workdir);
    if (checkout.code !== 0) {
      throw new Error(`git checkout ${repo.defaultBranch} failed: ${checkout.stderr}`);
    }
    const pull = await run("git", ["pull", "--ff-only", "origin", repo.defaultBranch], workdir);
    if (pull.code !== 0) throw new Error(`git pull failed: ${pull.stderr}`);
    return;
  }

  const fetch = await run("git", ["fetch", "--all", "--prune"], workdir);
  if (fetch.code !== 0) throw new Error(`git fetch failed: ${fetch.stderr}`);
  // -B (re)creates the local default branch pointed at its remote tip, discarding any
  // leftover safe branch a previous run left checked out.
  const reset = await run("git", ["checkout", "-B", repo.defaultBranch, `origin/${repo.defaultBranch}`], workdir);
  if (reset.code !== 0) throw new Error(`git checkout ${repo.defaultBranch} failed: ${reset.stderr}`);
}

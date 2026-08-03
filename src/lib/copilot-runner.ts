import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { EventEmitter } from "node:events";
import pidusage from "pidusage";

export const RUN_LOG_DIR = path.join(process.cwd(), "data", "runs");

/** Deterministic per-run log file path, stable before the run even starts writing to it. */
export function getRunLogPath(runId: string): string {
  return path.join(RUN_LOG_DIR, `${runId}.log`);
}

export type RunPermissionMode = "default" | "full";
export type RunOutputFormat = "text" | "json";

export interface StartCopilotRunOptions {
  runId: string;
  repoPath: string;
  prompt: string;
  agent?: string | null;
  model?: string | null;
  contextTier?: string | null;
  reasoningEffort?: string | null;
  permissionMode?: RunPermissionMode;
  outputFormat?: RunOutputFormat;
  timeoutSeconds?: number;
  /** Fired synchronously right after the child process spawns, so callers can persist pid/command early. */
  onSpawn?: (info: { pid: number | null; command: string }) => void;
}

export type CopilotRunEvent =
  | { type: "line"; data: string }
  | { type: "exit"; code: number | null; timedOut: boolean; cancelled: boolean }
  | { type: "error"; message: string };

interface RunProcessStats {
  pid: number;
  cpuTimeMs: number;
  memoryMb: number;
  sampledAt: number;
}

// Pinned to globalThis (like jobQueue in job-queue.ts): in dev mode, route handlers can be
// compiled into separate module instances, which would otherwise give the scheduler's run
// and the SSE route handler two disconnected copies of this state.
const globalForRunner = globalThis as unknown as {
  copilotRunEmitters?: Map<string, EventEmitter>;
  copilotRunProcesses?: Map<string, ChildProcessWithoutNullStreams>;
  copilotCancelledRunIds?: Set<string>;
  copilotRunStats?: Map<string, RunProcessStats>;
};

// One emitter per in-flight run; SSE endpoints subscribe to stream live output.
const runEmitters = globalForRunner.copilotRunEmitters ?? new Map<string, EventEmitter>();
// In-flight child processes, keyed by runId, so a run can be cancelled on demand.
const runProcesses =
  globalForRunner.copilotRunProcesses ?? new Map<string, ChildProcessWithoutNullStreams>();
// Runs that were explicitly cancelled, so their `close` handler reports it accurately.
const cancelledRunIds = globalForRunner.copilotCancelledRunIds ?? new Set<string>();
// Latest pidusage sample per in-flight run, for the "process info" panel / live polling endpoint.
const runStats = globalForRunner.copilotRunStats ?? new Map<string, RunProcessStats>();

if (process.env.NODE_ENV !== "production") {
  globalForRunner.copilotRunEmitters = runEmitters;
  globalForRunner.copilotRunProcesses = runProcesses;
  globalForRunner.copilotCancelledRunIds = cancelledRunIds;
  globalForRunner.copilotRunStats = runStats;
}

export function getRunEmitter(runId: string): EventEmitter | undefined {
  return runEmitters.get(runId);
}

/** Latest known CPU/memory sample for an in-flight run, if any (undefined once the run has finished). */
export function getRunProcessStats(runId: string): RunProcessStats | undefined {
  return runStats.get(runId);
}

/**
 * Attempts to terminate an in-flight run's child process (SIGTERM, then SIGKILL after a
 * grace period). Returns false if no in-memory process is tracked for this runId (e.g. the
 * run already finished, or the server restarted since it started).
 */
export function cancelRun(runId: string): boolean {
  const child = runProcesses.get(runId);
  if (!child) return false;
  cancelledRunIds.add(runId);
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 5000);
  return true;
}

function buildArgs(opts: StartCopilotRunOptions): string[] {
  const args: string[] = ["-p", opts.prompt, "--output-format", opts.outputFormat ?? "text"];

  args.push(opts.permissionMode === "full" ? "--allow-all" : "--allow-all-tools");

  if (opts.agent) args.push("--agent", opts.agent);
  if (opts.model) args.push("--model", opts.model);
  if (opts.contextTier) args.push("--context", opts.contextTier);
  if (opts.reasoningEffort) args.push("--effort", opts.reasoningEffort);

  // Auto-redact common credential env vars from captured output.
  args.push("--secret-env-vars", "GH_TOKEN,GITHUB_TOKEN");

  return args;
}

/**
 * Spawns `copilot -p <prompt>` in the target repo directory, streams output to a
 * per-run log file and to any live SSE subscribers, and enforces a hard timeout.
 */
export async function startCopilotRun(opts: StartCopilotRunOptions): Promise<{
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  logPath: string;
  pid: number | null;
  command: string;
  cpuTimeMs: number | null;
  peakMemoryMb: number | null;
}> {
  await mkdir(RUN_LOG_DIR, { recursive: true });
  const logPath = getRunLogPath(opts.runId);

  const emitter = new EventEmitter();
  runEmitters.set(opts.runId, emitter);

  const args = buildArgs(opts);
  const command = `copilot ${args.join(" ")}`;
  const timeoutMs = (opts.timeoutSeconds ?? 1800) * 1000;

  return new Promise((resolve) => {
    let timedOut = false;
    let settled = false;
    let statsTimer: NodeJS.Timeout | undefined;

    const child: ChildProcessWithoutNullStreams = spawn("copilot", args, {
      cwd: opts.repoPath,
      env: {
        ...process.env,
      },
      windowsHide: true,
    });
    runProcesses.set(opts.runId, child);
    opts.onSpawn?.({ pid: child.pid ?? null, command });

    if (child.pid) {
      const pid = child.pid;
      const sample = async () => {
        try {
          const stat = await pidusage(pid);
          runStats.set(opts.runId, {
            pid,
            cpuTimeMs: Math.round(stat.ctime),
            memoryMb: stat.memory / (1024 * 1024),
            sampledAt: Date.now(),
          });
        } catch {
          // Process may have exited between the tick and the sample; ignore.
        }
      };
      void sample();
      statsTimer = setInterval(sample, 3000);
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      // Give it a moment, then force kill if still alive.
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5000);
    }, timeoutMs);

    const handleChunk = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      void appendFile(logPath, text).catch(() => {});
      for (const line of text.split("\n")) {
        if (line.length === 0) continue;
        emitter.emit("event", { type: "line", data: line } satisfies CopilotRunEvent);
      }
    };

    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(statsTimer);
      const finalStats = runStats.get(opts.runId);
      runProcesses.delete(opts.runId);
      runStats.delete(opts.runId);
      cancelledRunIds.delete(opts.runId);
      emitter.emit("event", { type: "error", message: err.message } satisfies CopilotRunEvent);
      runEmitters.delete(opts.runId);
      resolve({
        exitCode: null,
        timedOut: false,
        cancelled: false,
        logPath,
        pid: child.pid ?? null,
        command,
        cpuTimeMs: finalStats?.cpuTimeMs ?? null,
        peakMemoryMb: finalStats?.memoryMb ?? null,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(statsTimer);
      const finalStats = runStats.get(opts.runId);
      runProcesses.delete(opts.runId);
      runStats.delete(opts.runId);
      const cancelled = cancelledRunIds.delete(opts.runId);
      emitter.emit("event", { type: "exit", code, timedOut, cancelled } satisfies CopilotRunEvent);
      runEmitters.delete(opts.runId);
      resolve({
        exitCode: code,
        timedOut,
        cancelled,
        logPath,
        pid: child.pid ?? null,
        command,
        cpuTimeMs: finalStats?.cpuTimeMs ?? null,
        peakMemoryMb: finalStats?.memoryMb ?? null,
      });
    });
  });
}

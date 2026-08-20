import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getRunDiff, getRemoteUrl } from "@/lib/git-safety";
import { getRepoWorkdirPath } from "@/lib/repo-workdir";
import { formatDuration } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import LiveRunLog from "@/components/LiveRunLog";
import CancelRunButton from "@/components/CancelRunButton";
import ProcessInfoPanel from "@/components/ProcessInfoPanel";
import RepoInfoPanel from "@/components/RepoInfoPanel";
import DiffView from "@/components/DiffView";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/api/auth/signin");

  const { id } = await params;
  const run = await prisma.run.findFirst({
    where: { id, task: { repo: { userId } } },
    include: { task: { include: { repo: true } } },
  });
  if (!run) notFound();

  const log = run.logPath ? await readFile(run.logPath, "utf8").catch(() => "") : "";

  const diff = await getRunDiff(run);

  const workdirPath = getRepoWorkdirPath(run.task.repo);
  const remoteUrl = await getRemoteUrl(workdirPath);

  const isLive = run.status === "PENDING" || run.status === "RUNNING";
  const commitRange =
    run.baseCommit && run.finalCommit
      ? `${run.baseCommit.slice(0, 8)}..${run.finalCommit.slice(0, 8)}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/tasks/${run.task.id}`} className="text-sm text-blue-400 hover:underline">
          ← {run.task.name}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold">Run {run.id.slice(0, 8)}</h1>
          <StatusBadge status={run.status} />
          {isLive && <CancelRunButton runId={run.id} />}
        </div>
        <p className="text-sm text-neutral-400">
          Trigger: {run.trigger}
          {run.branchName && ` · Branch: ${run.branchName}`}
          {run.startedAt && ` · Duration: ${formatDuration(run.startedAt, run.finishedAt)}`}
          {(run.hostname ?? run.task.repo.hostname) && ` · Machine: ${run.hostname ?? run.task.repo.hostname}`}
        </p>
        {run.baseCommit && (
          <p className="text-sm text-neutral-400">
            Start: <span title={run.baseCommit}>{run.baseCommit.slice(0, 8)}</span>
            {run.finalCommit && (
              <>
                {" · End: "}
                <span title={run.finalCommit}>{run.finalCommit.slice(0, 8)}</span>
              </>
            )}
          </p>
        )}
        {run.errorMessage && <p className="mt-2 text-sm text-red-400">{run.errorMessage}</p>}
      </div>

      <RepoInfoPanel
        info={{
          currentBranch: run.branchName ?? run.task.repo.defaultBranch,
          defaultBranch: run.task.repo.defaultBranch,
          remoteUrl,
          workdirPath,
        }}
      />

      <ProcessInfoPanel
        runId={run.id}
        isLive={isLive}
        initial={{
          pid: run.pid,
          command: run.command,
          cpuTimeMs: run.cpuTimeMs,
          memoryMb: run.peakMemoryMb,
          model: run.model ?? run.task.model,
          contextTier: run.contextTier ?? run.task.contextTier,
          reasoningEffort: run.reasoningEffort ?? run.task.reasoningEffort,
        }}
      />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Output</h2>
        <LiveRunLog
          runId={run.id}
          initialLog={log}
          isLive={isLive}
          outputFormat={(run.outputFormat ?? run.task.outputFormat) === "json" ? "json" : "text"}
        />
      </div>

      {diff && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Diff{commitRange && ` (${commitRange})`}</h2>
          <DiffView diff={diff} />
        </div>
      )}
    </div>
  );
}

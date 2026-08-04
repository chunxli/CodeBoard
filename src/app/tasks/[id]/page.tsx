import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { formatDuration } from "@/lib/format";
import { getNextRunDate } from "@/lib/cron-next-run";
import StatusBadge from "@/components/StatusBadge";
import TriggerRunButton from "@/components/TriggerRunButton";
import DeleteButton from "@/components/DeleteButton";
import CancelRunButton from "@/components/CancelRunButton";
import NextRunCountdown from "@/components/NextRunCountdown";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/api/auth/signin");

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, repo: { userId } },
    include: { repo: true, runs: { orderBy: { createdAt: "desc" } } },
  });
  if (!task) notFound();

  const nextRunAt =
    task.triggerType === "SCHEDULE" && task.enabled && task.cronExpression
      ? getNextRunDate(task.cronExpression)?.toISOString() ?? null
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{task.name}</h1>
          <p className="text-sm text-neutral-400">
            {task.repo.name} · {task.triggerType}
            {task.cronExpression && ` · ${task.cronExpression}`}
            {task.repo.hostname && ` · 机器：${task.repo.hostname}`}
          </p>
          {(task.model || task.fallbackModel) && (
            <p className="mt-1 text-sm text-neutral-400">
              模型：{task.model ?? "auto"}
              {task.fallbackModel && ` · 回退：${task.fallbackModel}`}
            </p>
          )}
          {task.triggerType === "SCHEDULE" && (
            <p className="mt-1 text-sm text-neutral-400">
              下次运行：{task.enabled ? <NextRunCountdown nextRun={nextRunAt} /> : "任务已禁用"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <TriggerRunButton taskId={task.id} />
          <Link
            href={`/tasks/${task.id}/edit`}
            className="rounded border border-neutral-600 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Edit
          </Link>
          <DeleteButton url={`/api/tasks/${task.id}`} label="Delete task" />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-300">Prompt</h3>
        <pre className="whitespace-pre-wrap text-sm text-neutral-200">{task.prompt}</pre>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Run history</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-2">Trigger</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {task.runs.map((run) => {
                const isLive = run.status === "PENDING" || run.status === "RUNNING";
                return (
                  <tr key={run.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                    <td className="px-4 py-2">
                      <Link href={`/runs/${run.id}`} className="text-blue-400 hover:underline">
                        {run.trigger}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-2 text-neutral-400">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2 text-neutral-400">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </td>
                    <td className="px-4 py-2 text-right">{isLive && <CancelRunButton runId={run.id} />}</td>
                  </tr>
                );
              })}
              {task.runs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

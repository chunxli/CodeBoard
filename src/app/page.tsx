import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import ActivityChart, { type DayBucket } from "@/components/ActivityChart";

export default async function DashboardPage() {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [runs, taskCount, repoCount, recentRuns] = await Promise.all([
    prisma.run.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { task: { select: { id: true, name: true } } },
    }),
    prisma.task.count(),
    prisma.repo.count(),
    prisma.run.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true, createdAt: true },
    }),
  ]);

  const days: DayBucket[] = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(since);
    date.setDate(date.getDate() + i);
    return {
      label: date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
      counts: {},
      total: 0,
      key: date.toDateString(),
    };
  }) as (DayBucket & { key: string })[];

  for (const run of recentRuns) {
    const key = new Date(run.createdAt).toDateString();
    const day = days.find((d) => (d as DayBucket & { key: string }).key === key);
    if (!day) continue;
    day.counts[run.status] = (day.counts[run.status] ?? 0) + 1;
    day.total += 1;
  }

  const finished = recentRuns.filter((r) =>
    ["SUCCESS", "FAILED", "TIMED_OUT"].includes(r.status)
  );
  const successRate =
    finished.length === 0
      ? null
      : Math.round((finished.filter((r) => r.status === "SUCCESS").length / finished.length) * 100);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
          <div className="text-2xl font-semibold">{repoCount}</div>
          <div className="text-sm text-neutral-400">Repos</div>
        </div>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
          <div className="text-2xl font-semibold">{taskCount}</div>
          <div className="text-sm text-neutral-400">Tasks</div>
        </div>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
          <div className="text-2xl font-semibold">{runs.length}</div>
          <div className="text-sm text-neutral-400">Recent runs</div>
        </div>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
          <div className="text-2xl font-semibold">{successRate === null ? "-" : `${successRate}%`}</div>
          <div className="text-sm text-neutral-400">Success rate (14d)</div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Activity (last 14 days)</h2>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
          <ActivityChart days={days} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent runs</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Trigger</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-2">
                    <Link href={`/runs/${run.id}`} className="text-blue-400 hover:underline">
                      {run.task.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{run.trigger}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    No runs yet. Create a repo and a task to get started.
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


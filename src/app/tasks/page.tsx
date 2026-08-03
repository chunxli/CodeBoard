import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getNextRunDate } from "@/lib/cron-next-run";
import TasksTable from "@/components/TasksTable";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: { repo: true, runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const tasksWithNextRun = tasks.map((task) => ({
    ...task,
    nextRunAt:
      task.triggerType === "SCHEDULE" && task.enabled && task.cronExpression
        ? getNextRunDate(task.cronExpression)?.toISOString() ?? null
        : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <Link
          href="/tasks/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          New task
        </Link>
      </div>
      <TasksTable tasks={tasksWithNextRun} />
    </div>
  );
}

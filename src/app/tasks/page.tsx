import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getNextRunDate } from "@/lib/cron-next-run";
import TasksTable from "@/components/TasksTable";

export default async function TasksPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/api/auth/signin");

  const tasks = await prisma.task.findMany({
    where: { repo: { userId } },
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

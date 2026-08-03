import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { jobQueue } from "@/lib/job-queue";
import { createPendingRun, executeRun } from "@/lib/task-executor";

const activeJobs = new Map<string, { expression: string; job: ScheduledTask }>();

async function triggerScheduledTask(taskId: string) {
  const run = await createPendingRun(taskId, "SCHEDULE");
  jobQueue.enqueue(() => executeRun(run.id));
}

/** Reconciles active node-cron jobs with the current set of enabled SCHEDULE tasks in the DB. */
export async function syncSchedules() {
  const tasks = await prisma.task.findMany({
    where: { triggerType: "SCHEDULE", enabled: true, cronExpression: { not: null } },
  });

  const desired = new Map(tasks.map((t) => [t.id, t.cronExpression!]));

  for (const [taskId, entry] of activeJobs) {
    const wanted = desired.get(taskId);
    if (!wanted || wanted !== entry.expression) {
      entry.job.stop();
      activeJobs.delete(taskId);
    }
  }

  for (const [taskId, expression] of desired) {
    if (activeJobs.has(taskId)) continue;
    if (!cron.validate(expression)) {
      console.error(`[scheduler] invalid cron expression for task ${taskId}: ${expression}`);
      continue;
    }
    const job = cron.schedule(expression, () => {
      triggerScheduledTask(taskId).catch((err) => console.error("[scheduler] trigger failed:", err));
    });
    activeJobs.set(taskId, { expression, job });
  }
}

let started = false;

/** Starts the periodic reconciliation loop once per server process. */
export function startScheduler() {
  if (started) return;
  started = true;
  syncSchedules().catch((err) => console.error("[scheduler] initial sync failed:", err));
  setInterval(() => {
    syncSchedules().catch((err) => console.error("[scheduler] sync failed:", err));
  }, 30_000);
}

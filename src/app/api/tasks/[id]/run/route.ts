import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobQueue } from "@/lib/job-queue";
import { createPendingRun, executeRun } from "@/lib/task-executor";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const run = await createPendingRun(task.id, "MANUAL");
  jobQueue.enqueue(() => executeRun(run.id));

  return NextResponse.json({ runId: run.id }, { status: 202 });
}

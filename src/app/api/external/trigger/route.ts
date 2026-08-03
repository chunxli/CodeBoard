import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { jobQueue } from "@/lib/job-queue";
import { createPendingRun, executeRun } from "@/lib/task-executor";

const triggerSchema = z.object({ taskId: z.string().min(1) });

async function authenticate(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const rawToken = auth.slice("Bearer ".length).trim();
  if (!rawToken) return false;

  const tokenHash = hashToken(rawToken);
  const record = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!record) return false;

  await prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return true;
}

export async function POST(req: NextRequest) {
  if (!(await authenticate(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const run = await createPendingRun(task.id, "API");
  jobQueue.enqueue(() => executeRun(run.id));

  return NextResponse.json({ runId: run.id }, { status: 202 });
}

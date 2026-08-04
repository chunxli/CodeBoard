import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validation";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { repo: { userId } },
    orderBy: { createdAt: "desc" },
    include: { repo: true, runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.triggerType === "SCHEDULE" && !parsed.data.cronExpression) {
    return NextResponse.json(
      { error: "cronExpression is required when triggerType is SCHEDULE" },
      { status: 400 }
    );
  }

  if (parsed.data.fallbackModel && !parsed.data.model) {
    return NextResponse.json({ error: "A primary model is required when fallbackModel is set" }, { status: 400 });
  }
  if (parsed.data.fallbackModel && parsed.data.fallbackModel === parsed.data.model) {
    return NextResponse.json({ error: "fallbackModel must differ from model" }, { status: 400 });
  }

  const repo = await prisma.repo.findUnique({ where: { id: parsed.data.repoId, userId } });
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const task = await prisma.task.create({ data: parsed.data });
  return NextResponse.json(task, { status: 201 });
}

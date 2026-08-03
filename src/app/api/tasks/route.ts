import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validation";

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: { repo: true, runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
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

  const task = await prisma.task.create({ data: parsed.data });
  return NextResponse.json(task, { status: 201 });
}

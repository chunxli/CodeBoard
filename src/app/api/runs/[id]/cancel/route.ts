import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelRun } from "@/lib/copilot-runner";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = await prisma.run.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (run.status === "RUNNING") {
    const killed = cancelRun(id);
    if (!killed) {
      // No in-memory process tracked (e.g. server restarted since it started); mark it
      // cancelled directly so the UI doesn't show it as stuck forever.
      await prisma.run.update({
        where: { id },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (run.status === "PENDING") {
    // Still queued; executeRun() re-checks status before doing any real work.
    await prisma.run.update({
      where: { id },
      data: { status: "CANCELLED", finishedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Run is not cancellable" }, { status: 400 });
}

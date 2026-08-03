import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRunProcessStats } from "@/lib/copilot-runner";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = await prisma.run.findUnique({
    where: { id },
    select: { pid: true, command: true, cpuTimeMs: true, peakMemoryMb: true },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prefer the live in-memory sample (updated every few seconds while the process runs);
  // fall back to the last value persisted to the DB once the process has exited.
  const live = getRunProcessStats(id);
  return NextResponse.json({
    pid: run.pid,
    command: run.command,
    cpuTimeMs: live?.cpuTimeMs ?? run.cpuTimeMs,
    memoryMb: live?.memoryMb ?? run.peakMemoryMb,
  });
}

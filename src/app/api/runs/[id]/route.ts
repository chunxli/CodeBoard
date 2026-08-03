import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getRunDiff } from "@/lib/git-safety";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = await prisma.run.findUnique({
    where: { id },
    include: { task: { include: { repo: true } } },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const log = run.logPath ? await readFile(run.logPath, "utf8").catch(() => "") : "";

  const diff = await getRunDiff(run);

  return NextResponse.json({ ...run, log, diff });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ repos: [], tasks: [], runs: [] });
  }

  const [repos, tasks, runs] = await Promise.all([
    prisma.repo.findMany({
      where: { name: { contains: q } },
      take: 5,
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { name: { contains: q } },
      take: 5,
      select: { id: true, name: true },
    }),
    prisma.run.findMany({
      where: { id: { contains: q } },
      take: 5,
      select: { id: true, status: true, task: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({ repos, tasks, runs });
}

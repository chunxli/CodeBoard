import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await prisma.run.findMany({
    where: { task: { repo: { userId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { task: { select: { id: true, name: true, repoId: true } } },
  });
  return NextResponse.json(runs);
}

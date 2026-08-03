import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { task: { select: { id: true, name: true, repoId: true } } },
  });
  return NextResponse.json(runs);
}

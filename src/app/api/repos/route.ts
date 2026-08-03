import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRepoSchema } from "@/lib/validation";

export async function GET() {
  const repos = await prisma.repo.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(repos);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createRepoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repo = await prisma.repo.create({ data: parsed.data });
  return NextResponse.json(repo, { status: 201 });
}

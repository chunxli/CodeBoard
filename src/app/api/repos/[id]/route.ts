import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateRepoSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateRepoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repo = await prisma.repo.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(repo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.repo.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

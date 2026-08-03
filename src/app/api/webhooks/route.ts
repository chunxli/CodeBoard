import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/validation";
import { generateSecret } from "@/lib/crypto";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await prisma.webhookConfig.findMany({ where: { repo: { userId } }, include: { repo: true } });
  // Secret is only ever shown at creation time; omit it from listing responses.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return NextResponse.json(configs.map(({ secret, ...rest }) => rest));
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repo = await prisma.repo.findUnique({ where: { id: parsed.data.repoId, userId } });
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  const secret = generateSecret();
  const config = await prisma.webhookConfig.upsert({
    where: { repoId: parsed.data.repoId },
    update: { secret },
    create: { repoId: parsed.data.repoId, secret },
  });

  // Return the raw secret once so the user can paste it into GitHub's webhook settings.
  return NextResponse.json({ ...config, secret }, { status: 201 });
}

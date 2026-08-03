import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/validation";
import { generateSecret } from "@/lib/crypto";

export async function GET() {
  const configs = await prisma.webhookConfig.findMany({ include: { repo: true } });
  // Secret is only ever shown at creation time; omit it from listing responses.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return NextResponse.json(configs.map(({ secret, ...rest }) => rest));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const secret = generateSecret();
  const config = await prisma.webhookConfig.upsert({
    where: { repoId: parsed.data.repoId },
    update: { secret },
    create: { repoId: parsed.data.repoId, secret },
  });

  // Return the raw secret once so the user can paste it into GitHub's webhook settings.
  return NextResponse.json({ ...config, secret }, { status: 201 });
}

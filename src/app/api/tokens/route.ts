import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createApiTokenSchema } from "@/lib/validation";
import { hashToken } from "@/lib/crypto";

export async function GET() {
  const tokens = await prisma.apiToken.findMany({ orderBy: { createdAt: "desc" } });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return NextResponse.json(tokens.map(({ tokenHash, ...rest }) => rest));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createApiTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rawToken = "cb_" + randomBytes(24).toString("hex");
  const token = await prisma.apiToken.create({
    data: { name: parsed.data.name, tokenHash: hashToken(rawToken) },
  });

  // Raw token is only ever shown here; only its hash is persisted.
  return NextResponse.json({ ...token, token: rawToken }, { status: 201 });
}

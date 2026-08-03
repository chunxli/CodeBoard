import { NextResponse } from "next/server";
import { getSupportedModels } from "@/lib/copilot-models";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const models = await getSupportedModels();
  return NextResponse.json({ models });
}

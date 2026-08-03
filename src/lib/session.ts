import { auth } from "@/auth";

/** Resolves the signed-in user's id for scoping DB queries (already gated by proxy.ts, checked again defensively). */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

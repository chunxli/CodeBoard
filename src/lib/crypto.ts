import { createHmac, timingSafeEqual, randomBytes, createHash } from "node:crypto";

/** Verifies a GitHub webhook `X-Hub-Signature-256` header against the raw request body. */
export function verifyGithubSignature(secret: string, payload: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

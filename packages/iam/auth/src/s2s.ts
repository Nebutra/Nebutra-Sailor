import { createHmac, timingSafeEqual } from "node:crypto";

export interface ServiceTokenContext {
  userId?: string;
  organizationId?: string;
  role?: string;
  plan?: string;
}

function canonicalizeServiceTokenContext(context: ServiceTokenContext): string {
  return [
    context.userId ?? "",
    context.organizationId ?? "",
    context.role ?? "",
    context.plan ?? "",
  ].join(":");
}

function signCanonicalServiceToken(canonical: string, secret: string): string {
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function signServiceToken(
  context: ServiceTokenContext,
  secret = process.env.SERVICE_SECRET ?? "",
): string {
  if (!secret) {
    throw new Error("SERVICE_SECRET is required to sign service tokens");
  }

  return signCanonicalServiceToken(canonicalizeServiceTokenContext(context), secret);
}

export function verifyServiceToken(
  token: string | undefined,
  userId?: string,
  organizationId?: string,
  role?: string,
  plan?: string,
  secret = process.env.SERVICE_SECRET ?? "",
): boolean {
  if (!token || !secret) return false;

  const context: ServiceTokenContext = {};
  if (userId) context.userId = userId;
  if (organizationId) context.organizationId = organizationId;
  if (role) context.role = role;
  if (plan) context.plan = plan;

  const expected = signCanonicalServiceToken(canonicalizeServiceTokenContext(context), secret);
  const tokenBuffer = Buffer.from(token, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (tokenBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

import { createHmac } from "node:crypto";

/**
 * Test helper: generates a valid S2S JWT-shaped HMAC service token.
 * Sets SERVICE_SECRET env var if not already set.
 */
export const TEST_SERVICE_SECRET = "test-secret-for-s2s-hmac";

function encodeBase64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function generateServiceToken(
  userId?: string,
  orgId?: string,
  role?: string,
  plan?: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url({ alg: "HS256", typ: "JWT" });
  const body = encodeBase64Url({
    ...(userId ? { userId } : {}),
    ...(orgId ? { organizationId: orgId } : {}),
    ...(role ? { role } : {}),
    ...(plan ? { plan } : {}),
    iat: now,
    exp: now + 300,
  });
  const signingInput = `${header}.${body}`;
  const signature = createHmac("sha256", TEST_SERVICE_SECRET)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${signature}`;
}

/**
 * Build headers object with S2S HMAC for testing tenant context.
 */
export function s2sHeaders(opts: {
  userId?: string;
  orgId?: string;
  role?: string;
  plan?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (opts.userId) headers["x-user-id"] = opts.userId;
  if (opts.orgId) headers["x-organization-id"] = opts.orgId;
  if (opts.role) headers["x-role"] = opts.role;
  if (opts.plan) headers["x-plan"] = opts.plan;
  headers["x-service-token"] = generateServiceToken(opts.userId, opts.orgId, opts.role, opts.plan);
  return headers;
}

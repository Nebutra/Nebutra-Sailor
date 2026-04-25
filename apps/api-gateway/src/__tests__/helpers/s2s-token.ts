import { createHmac } from "node:crypto";

/**
 * Test helper: generates a valid S2S HMAC service token for the given tenant headers.
 * Sets SERVICE_SECRET env var if not already set.
 */
export const TEST_SERVICE_SECRET = "test-secret-for-s2s-hmac";

export function generateServiceToken(
  userId?: string,
  orgId?: string,
  role?: string,
  plan?: string,
): string {
  const canonical = `${userId ?? ""}:${orgId ?? ""}:${role ?? ""}:${plan ?? ""}`;
  return createHmac("sha256", TEST_SERVICE_SECRET).update(canonical).digest("hex");
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

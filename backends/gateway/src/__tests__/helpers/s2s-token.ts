import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";

/**
 * Test helper: mints jose HS256 service tokens matching production
 * `@nebutra/auth` `signServiceToken` (claims: userId, organizationId, role, plan).
 *
 * Implemented with jose directly so tests that `vi.mock("@nebutra/auth")` still work.
 */
export const TEST_SERVICE_SECRET = "test-secret-for-s2s-hmac";

export async function generateServiceToken(
  userId?: string,
  orgId?: string,
  role?: string,
  plan?: string,
): Promise<string> {
  const claims: Record<string, string> = {};
  if (userId) claims.userId = userId;
  if (orgId) claims.organizationId = orgId;
  if (role) claims.role = role;
  if (plan) claims.plan = plan;

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(TEST_SERVICE_SECRET));
}

/**
 * Build headers with a valid S2S JWT for testing tenant context.
 */
export async function s2sHeaders(opts: {
  userId?: string;
  orgId?: string;
  role?: string;
  plan?: string;
}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (opts.userId) headers["x-user-id"] = opts.userId;
  if (opts.orgId) headers["x-organization-id"] = opts.orgId;
  if (opts.role) headers["x-role"] = opts.role;
  if (opts.plan) headers["x-plan"] = opts.plan;
  headers["x-service-token"] = await generateServiceToken(
    opts.userId,
    opts.orgId,
    opts.role,
    opts.plan,
  );
  return headers;
}

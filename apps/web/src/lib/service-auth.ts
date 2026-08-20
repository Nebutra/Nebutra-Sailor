/**
 * Server→gateway authentication for calls the web app makes on a user's behalf.
 *
 * The gateway trusts `x-user-id` / `x-organization-id` / `x-role` / `x-plan`
 * only when they arrive with an `x-service-token` whose claims match them
 * field for field — see `verifyServiceToken` in `packages/iam/auth/src/s2s.ts`
 * and its caller `backends/gateway/src/middlewares/tenantContext.ts`. A
 * mismatch is not an error the caller sees: the gateway logs a warning, drops
 * the headers, and serves the request as anonymous.
 *
 * So the headers and the claims are derived from one object here. Splitting
 * them is the whole failure mode, and there is no second place to get it wrong.
 */

import type { ServiceTokenContext } from "@nebutra/auth";

export const SERVICE_TOKEN_HEADER = "x-service-token";

export type ServiceAuthPrincipal = {
  userId?: string | null;
  organizationId?: string | null;
  /** Clerk-style role claim, passed through verbatim (`org:admin`, …). */
  role?: string | null;
  plan?: string | null;
};

export type SignServiceToken = (context: ServiceTokenContext) => Promise<string>;

/** Drop empty fields: `verifyServiceToken` compares against absent, not "". */
function toContext(principal: ServiceAuthPrincipal): ServiceTokenContext {
  const context: ServiceTokenContext = {};
  if (principal.userId) context.userId = principal.userId;
  if (principal.organizationId) context.organizationId = principal.organizationId;
  if (principal.role) context.role = principal.role;
  if (principal.plan) context.plan = principal.plan;
  return context;
}

/**
 * Build the headers that carry a signed tenant context to the gateway.
 *
 * Returns `{}` for an anonymous principal — a request with no user is a
 * legitimately unauthenticated request. Anything else either produces a
 * complete, self-consistent header set or throws, because a partial one would
 * be indistinguishable from anonymous at the other end.
 */
export async function buildServiceAuthHeaders(
  principal: ServiceAuthPrincipal,
  sign: SignServiceToken,
): Promise<Record<string, string>> {
  const context = toContext(principal);
  if (!context.userId) {
    return {};
  }

  const headers: Record<string, string> = {
    [SERVICE_TOKEN_HEADER]: await sign(context),
    "x-user-id": context.userId,
  };
  if (context.organizationId) headers["x-organization-id"] = context.organizationId;
  if (context.role) headers["x-role"] = context.role;
  if (context.plan) headers["x-plan"] = context.plan;

  return headers;
}

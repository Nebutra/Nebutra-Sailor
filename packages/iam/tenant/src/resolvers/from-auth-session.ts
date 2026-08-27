import { logger } from "@nebutra/logger";
import type { TenantResolver } from "../types";

// =============================================================================
// Auth-Session Tenant Resolver (Wave 2, Phase 2.1)
// =============================================================================

/**
 * Minimal shape this resolver needs from a session object.
 *
 * Structurally compatible with `Session` from `@nebutra/auth` but defined
 * locally so `@nebutra/tenant` stays IAM-neutral — there is no hard dep on
 * `@nebutra/auth`. Callers pass in their own session getter (typically
 * `(req) => auth.getSession(req)`), keeping the dependency direction one-way:
 * apps depend on both packages; neither package depends on the other.
 */
export interface AuthSessionLike {
  organizationId?: string;
}

/**
 * Function that retrieves an auth session from a resolver-input request.
 *
 * Receives the same request envelope as any other {@link TenantResolver}
 * (`{ headers?, url?, token?, apiKey? }`). Returns either an `AuthSessionLike`
 * or `null` when no session exists. May be sync or async.
 */
export type SessionGetter = (
  req: Parameters<TenantResolver>[0],
) => Promise<AuthSessionLike | null> | AuthSessionLike | null;

/**
 * Resolve `tenantId` from an auth session's `organizationId`.
 *
 * This is the canonical bridge between `Session.organizationId` (from
 * `@nebutra/auth`) and the tenant context. It is the standard second link in
 * the resolver chain — after `fromHeader` (service-to-service) and before any
 * fallback strategy.
 *
 * @example
 * ```ts
 * import { createAuth } from "@nebutra/auth/server";
 * import { tenantMiddleware, compose, fromHeader, fromAuthSession } from "@nebutra/tenant";
 *
 * const auth = await createAuth({ provider: "better-auth" });
 *
 * app.use(
 *   tenantMiddleware({
 *     resolver: compose(
 *       fromHeader("x-tenant-id"),           // service-to-service wins
 *       fromAuthSession(() => auth.getSession()), // then user-session
 *     ),
 *   }),
 * );
 * ```
 */
export function fromAuthSession(getSession: SessionGetter): TenantResolver {
  return async (req) => {
    // Intentionally NOT wrapped in try/catch — errors propagate to the
    // caller (typically the `compose` chain, which logs + continues to the
    // next resolver). Silently swallowing here would mask real auth bugs.
    const session = await Promise.resolve(getSession(req));

    if (session?.organizationId) {
      logger.debug("Tenant resolved from auth session", {
        tenantId: session.organizationId,
      });
      return session.organizationId;
    }

    return null;
  };
}

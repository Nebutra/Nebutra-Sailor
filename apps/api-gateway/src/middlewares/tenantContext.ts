import { createAuth } from "@nebutra/auth/server";
import { verifyServiceToken } from "@nebutra/auth";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";
import { getAuthProvider } from "../config/env.js";

export interface TenantContext {
  userId?: string;
  organizationId?: string;
  role?: string;
  plan: string;
  ip: string;
}

declare module "hono" {
  interface ContextVariableMap {
    tenant: TenantContext;
  }
}

// ── Singleton auth provider ────────────────────────────────────────────────

let authProvider: Awaited<ReturnType<typeof createAuth>> | null = null;

/**
 * Lazy-init the auth provider singleton.
 * Called once per request if a Bearer token is present.
 */
async function getAuthProviderInstance(): Promise<Awaited<ReturnType<typeof createAuth>>> {
  if (!authProvider) {
    const provider = getAuthProvider();
    authProvider = await createAuth({ provider });
  }
  return authProvider;
}

// ── S2S HMAC verification ──────────────────────────────────────────────────

/**
 * Extract and verify JWT from Authorization header using provider-agnostic auth,
 * then populate tenant context.
 *
 * Flow:
 * 1. Check for S2S service token — verify HMAC before trusting headers
 * 2. Check for Bearer token — use auth provider to verify/decode
 * 3. No token — unauthenticated (tenant has no userId)
 *
 * If verification fails, the request is treated as unauthenticated.
 * Downstream `requireAuth` / `requireOrganization` guards are responsible
 * for rejecting requests that need authentication.
 */
export async function tenantContextMiddleware(c: Context, next: Next) {
  // Extract client IP (handle proxies)
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown";

  const tenant: TenantContext = {
    plan: "FREE",
    ip,
  };

  // Header-based fallback for service-to-service calls.
  // Canonical headers (ONLY trusted when accompanied by a valid HMAC service token):
  //   - x-user-id
  //   - x-organization-id
  //   - x-role
  //   - x-plan
  //
  // SECURITY: The legacy `x-tenant-id` alias was removed (2026-04).
  // Any external client could spoof it without HMAC verification; all
  // callers must now use `x-organization-id` together with a valid
  // `x-service-token`, or a Bearer JWT from a trusted auth provider.
  const headerUserId = c.req.header("x-user-id") || c.req.header("x_user_id") || undefined;
  const headerOrganizationId =
    c.req.header("x-organization-id") || c.req.header("x_organization_id") || undefined;
  const headerRole = c.req.header("x-role") || c.req.header("x_role") || undefined;
  const headerPlan = c.req.header("x-plan") || c.req.header("x_plan") || undefined;

  // Only trust S2S headers when accompanied by a valid HMAC service token.
  // When no service token is present, S2S headers are NOT trusted — the
  // Bearer JWT flow below (or defaults) is the only source of tenant context.
  const serviceToken = c.req.header("x-service-token");

  // Warn when legacy `x-tenant-id` is present but the request carries no
  // service token — this is almost always a client that needs updating.
  const legacyTenantHeader =
    c.req.header("x-tenant-id") || c.req.header("x_tenant_id") || undefined;
  if (legacyTenantHeader && !serviceToken) {
    logger.warn(
      "Ignoring legacy x-tenant-id header without x-service-token — update client to use x-organization-id with a valid HMAC service token",
      { ip },
    );
  }

  if (serviceToken) {
    // S2S call with explicit service token — verify HMAC before trusting headers
    if (
      verifyServiceToken(serviceToken, headerUserId, headerOrganizationId, headerRole, headerPlan)
    ) {
      if (headerUserId) tenant.userId = headerUserId;
      if (headerOrganizationId) tenant.organizationId = headerOrganizationId;
      if (headerRole) tenant.role = headerRole;
      if (headerPlan) tenant.plan = headerPlan;
    } else {
      logger.warn("S2S HMAC verification failed — ignoring tenant headers", {
        hasUserId: Boolean(headerUserId),
        hasOrgId: Boolean(headerOrganizationId),
      });
    }
  }

  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    try {
      // Use provider-agnostic auth to verify the token
      const auth = await getAuthProviderInstance();

      // Construct a Request object from Hono context for the auth provider
      const request = new Request(c.req.url, {
        headers: new Headers(c.req.raw.headers),
      });

      const session = await auth.getSession(request);

      if (session) {
        if (session.userId) tenant.userId = session.userId;
        if (session.organizationId) tenant.organizationId = session.organizationId;
        if (session.role) tenant.role = session.role;
      }
    } catch (error) {
      // Log the error but treat the request as unauthenticated — do not throw.
      logger.warn("JWT verification failed, treating as unauthenticated", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  c.set("tenant", tenant);

  // NOTE: The middleware no longer attaches a `prisma` client to the Hono
  // context. Route handlers must explicitly call `getTenantDb(orgId)` from
  // `@nebutra/db` (or `getSystemDb()` for admin / webhook flows that lack a
  // tenant context). This forces every Prisma call site to state its tenant
  // scope up front, which prevents accidental cross-tenant leaks.

  await next();
}

/**
 * Require authenticated user
 */
export async function requireAuth(c: Context, next: Next) {
  const tenant = c.get("tenant");

  if (!tenant?.userId) {
    return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
  }

  await next();
}

/**
 * Require organization membership
 */
export async function requireOrganization(c: Context, next: Next) {
  const tenant = c.get("tenant");

  if (!tenant?.organizationId) {
    return c.json({ error: "Forbidden", message: "Organization membership required" }, 403);
  }

  await next();
}

/**
 * Require specific organization roles.
 * Pass one or more allowed roles — user must have at least one.
 * Clerk org_role values: "org:owner", "org:admin", "org:member", "org:viewer"
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const tenant = c.get("tenant");

    if (!tenant?.userId) {
      return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);
    }

    if (!tenant?.organizationId) {
      return c.json({ error: "Forbidden", message: "Organization membership required" }, 403);
    }

    if (!tenant?.role || !allowedRoles.includes(tenant.role)) {
      return c.json(
        {
          error: "Forbidden",
          message: `Insufficient permissions. Required: ${allowedRoles.join(" or ")}`,
          required: allowedRoles,
          current: tenant.role ?? null,
        },
        403,
      );
    }

    await next();
  };
}

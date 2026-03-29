import { createHmac, timingSafeEqual } from "node:crypto";
import { createAuth } from "@nebutra/auth/server";
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

let serviceSecretWarningLogged = false;

/**
 * Verify the `x-service-token` HMAC against the canonical S2S headers.
 * Returns `true` when the token is valid. Returns `false` when verification
 * fails or cannot be performed (missing secret / missing token).
 */
function verifyServiceToken(
  serviceToken: string,
  headerUserId: string | undefined,
  headerOrganizationId: string | undefined,
  headerRole: string | undefined,
  headerPlan: string | undefined,
): boolean {
  const secret = process.env.SERVICE_SECRET;

  if (!secret) {
    if (!serviceSecretWarningLogged) {
      serviceSecretWarningLogged = true;
      logger.warn(
        "SERVICE_SECRET is not set — S2S header verification is disabled (dev mode fallback)",
      );
    }
    // Dev mode: allow headers without verification
    return true;
  }

  const canonical = `${headerUserId ?? ""}:${headerOrganizationId ?? ""}:${headerRole ?? ""}:${headerPlan ?? ""}`;
  const expected = createHmac("sha256", secret).update(canonical).digest();

  let tokenBuffer: Buffer;
  try {
    tokenBuffer = Buffer.from(serviceToken, "hex");
  } catch {
    return false;
  }

  if (tokenBuffer.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(expected, tokenBuffer);
}

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
  // Canonical headers:
  //   - x-user-id
  //   - x-organization-id
  // Legacy compatibility:
  //   - x-tenant-id (mapped to organizationId)
  const headerUserId = c.req.header("x-user-id") || c.req.header("x_user_id") || undefined;
  const headerOrganizationId =
    c.req.header("x-organization-id") ||
    c.req.header("x_organization_id") ||
    c.req.header("x-tenant-id") ||
    c.req.header("x_tenant_id") ||
    undefined;
  const headerRole = c.req.header("x-role") || c.req.header("x_role") || undefined;
  const headerPlan = c.req.header("x-plan") || c.req.header("x_plan") || undefined;

  // Only trust S2S headers when accompanied by a valid HMAC service token,
  // OR when no Bearer JWT is present and no service token is provided (skip entirely).
  const serviceToken = c.req.header("x-service-token");

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
  // When no service token is present, S2S headers are NOT trusted.
  // The Bearer JWT flow below (or defaults) will be the only source of tenant context.

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

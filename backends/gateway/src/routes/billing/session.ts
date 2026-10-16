/**
 * The product app's own session, for the billing routes it calls from the
 * browser.
 *
 * `tenantContextMiddleware` resolves identity from a service token or a Bearer
 * JWT only. The Vite product app has neither: it is signed in with the auth
 * provider's session cookie on the same origin (the gateway mounted at /api,
 * or the dev proxy in the local preview), and its `getToken()` is null. Without
 * this, every billing read from /billing answered 401 to a signed-in buyer.
 *
 * When no identity was resolved upstream, this reads the session from the
 * cookie with the same auth provider the /api/auth routes use. A state-changing
 * request must also come from the product's own origin (the Origin header),
 * so a cross-site form cannot spend with the buyer's cookie; the cookie's
 * SameSite policy and the JSON content type are the other two layers.
 *
 * Scoped to the billing routes on purpose. Moving cookie sessions into
 * tenantContextMiddleware for every route is a wider security decision.
 */

import type { AuthProvider } from "@nebutra/auth";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";

type AuthInstance = Pick<AuthProvider, "getSession">;
let authInstance: Promise<AuthInstance> | undefined;

/** Loaded on the first cookie request only: service-token and Bearer calls never pay for it. */
function auth(): Promise<AuthInstance> {
  authInstance ??= (async () => {
    const [{ getConfiguredAuthProvider }, { createAuth }] = await Promise.all([
      import("@nebutra/auth"),
      import("@nebutra/auth/server"),
    ]);
    return createAuth({ provider: getConfiguredAuthProvider() });
  })();
  return authInstance;
}

/** Test seam: replace the auth provider the cookie session is read with. */
export function setBillingSessionAuth(next: (() => Promise<AuthInstance>) | undefined): void {
  authInstance = next ? next() : undefined;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigins(c: Context): Set<string> {
  const origins = new Set<string>([new URL(c.req.url).origin]);
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // A malformed APP_URL adds nothing.
    }
  }
  return origins;
}

export async function browserSession(c: Context, next: Next) {
  const tenant = c.get("tenant") ?? {};
  if (tenant.userId || c.req.header("authorization") || !c.req.header("cookie")) {
    return next();
  }

  if (!SAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header("origin");
    if (!origin || !allowedOrigins(c).has(origin)) {
      return c.json({ error: "Forbidden", message: "Cross-origin request refused" }, 403);
    }
  }

  try {
    const session = await (await auth()).getSession(c.req.raw);
    if (session?.userId) {
      const resolved = { ...tenant, userId: session.userId };
      if (session.organizationId) {
        resolved.organizationId = session.organizationId;
        resolved.tenantId = session.organizationId;
        resolved.tenantKind = "organization";
      }
      if (session.role) resolved.role = session.role;
      c.set("tenant", resolved);
    }
  } catch (error) {
    // Unauthenticated, not an error page: requireAuth answers 401 next.
    logger.warn("Billing could not read the browser session", { error });
  }
  return next();
}

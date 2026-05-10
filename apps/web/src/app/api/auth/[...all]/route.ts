/**
 * Auth catch-all API route.
 *
 * Routes /api/auth/* requests to the configured provider's middleware:
 *  - Better Auth — delegates sign-up / sign-in / sign-out / session / OAuth
 *  - NextAuth (Auth.js v5) — delegates the same surface via Auth.js handlers
 *  - Clerk — Clerk owns its own routing (clerkMiddleware), so this route 404s
 *
 * The provider is resolved from `AUTH_PROVIDER` (or `NEXT_PUBLIC_AUTH_PROVIDER`)
 * and the resulting handler is cached for the lifetime of the worker.
 *
 * Audit hooks: this route emits `auth.login.success`, `auth.login.failure`,
 * `auth.logout`, and `auth.signup` based on the path + response status. We do
 * NOT call into other auth helpers from middleware — handlers below are the
 * single source of audit truth for these flows.
 */

import { auditLogger } from "@nebutra/audit";
import { getAuditableContext } from "@nebutra/auth";
import type { AuthProvider, AuthProviderId } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";

type AuditableMaybe = Awaited<ReturnType<typeof getAuditableContext>>;
type LogInput = Parameters<ReturnType<typeof auditLogger>["log"]>[0];

const PROVIDERS_USING_THIS_ROUTE: ReadonlySet<AuthProviderId> = new Set([
  "better-auth",
  "nextauth",
]);

const rawProvider =
  process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
const provider = rawProvider as AuthProviderId;

let authInstance: AuthProvider | null = null;

async function getAuth(): Promise<AuthProvider> {
  if (!authInstance) {
    authInstance = await createAuth({ provider });
  }
  return authInstance;
}

interface AuditDescriptor {
  log: LogInput;
  /**
   * If true, the audit logger will be invoked even when there is no
   * authenticated session (e.g. login failures — the request is by definition
   * pre-auth). The logger uses a synthetic anonymous actor in that case.
   */
  alwaysEmit?: boolean;
}

function deriveAuditFromRequest(req: Request, status: number): AuditDescriptor | null {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();
  if (method !== "POST") return null;

  const ok = status >= 200 && status < 300;
  const denied = status === 401 || status === 403;

  if (path.endsWith("/sign-in") || path.includes("/sign-in/")) {
    if (ok) {
      return {
        log: {
          action: "auth.login.success",
          outcome: "success",
          resource: { type: "credential", id: path },
          severity: "info",
        },
      };
    }
    if (denied || status === 400) {
      return {
        log: {
          action: "auth.login.failure",
          outcome: denied ? "denied" : "failure",
          resource: { type: "credential", id: path },
          severity: "warning",
        },
        alwaysEmit: true,
      };
    }
  }

  if (path.endsWith("/sign-out") || path.includes("/sign-out")) {
    if (ok) {
      return {
        log: {
          action: "auth.logout",
          outcome: "success",
          resource: { type: "session", id: path },
          severity: "info",
        },
      };
    }
  }

  if (path.endsWith("/sign-up") || path.includes("/sign-up/")) {
    if (ok) {
      return {
        log: {
          action: "auth.signup",
          outcome: "success",
          resource: { type: "user", id: path },
          severity: "info",
        },
      };
    }
  }

  return null;
}

async function emitAudit(
  request: Request,
  ctx: AuditableMaybe,
  descriptor: AuditDescriptor,
): Promise<void> {
  // For pre-auth events (login failure) we synthesize an "anonymous" actor.
  const defaults = ctx ?? {
    actor: { id: "anonymous", type: "user" as const },
    tenantId: "system",
  };
  if (!ctx && !descriptor.alwaysEmit) return;

  // auditLogger swallows internal errors; this never throws.
  await auditLogger(request, defaults).log(descriptor.log);
}

async function handler(request: Request): Promise<Response> {
  if (!PROVIDERS_USING_THIS_ROUTE.has(provider)) {
    // Clerk and other non-routed providers don't use this catch-all.
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let response: Response;
  try {
    const auth = await getAuth();
    const authHandler = auth.middleware();
    response = (await authHandler(request)) ?? new Response(null, { status: 404 });
  } catch (error) {
    logger.error("[auth] API route error:", error);
    response = new Response(JSON.stringify({ error: "Internal auth error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const descriptor = deriveAuditFromRequest(request, response.status);
    if (descriptor) {
      // Resolve actor AFTER the handler runs so successful logins surface
      // the freshly-established session.
      const ctx = await getAuditableContext(request).catch(() => null);
      await emitAudit(request, ctx, descriptor);
    }
  } catch (error) {
    logger.warn("[auth] failed to emit auth audit event", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return response;
}

export const GET = handler;
export const POST = handler;

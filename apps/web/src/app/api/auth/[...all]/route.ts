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

import { createAccessGate, createPrismaAccessInviteStore } from "@nebutra/access-gate";
import { auditLogger } from "@nebutra/audit";
import type { AuthProvider, AuthProviderId } from "@nebutra/auth";
import { getAuditableContext, getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { db } from "@/lib/db";
import { applySessionHint } from "@/lib/session-hint";

type AuditableMaybe = Awaited<ReturnType<typeof getAuditableContext>>;
type LogInput = Parameters<ReturnType<typeof auditLogger>["log"]>[0];

const PROVIDERS_USING_THIS_ROUTE: ReadonlySet<AuthProviderId> = new Set([
  "better-auth",
  "nextauth",
]);

const provider = getConfiguredAuthProvider();

let authInstance: AuthProvider | null = null;

interface AccessGateSignupContext {
  email: string;
  plaintextCode: string;
  tenantId?: string;
}

async function getAuth(): Promise<AuthProvider> {
  if (!authInstance) {
    authInstance = await createAuth({ provider });
  }
  return authInstance;
}

function isAccessGateEnabled(): boolean {
  return process.env.ACCESS_GATE_MODE === "invite";
}

function isEmailSignUpRequest(request: Request): boolean {
  const url = new URL(request.url);
  return request.method.toUpperCase() === "POST" && url.pathname.endsWith("/sign-up/email");
}

function createAccessGateService() {
  return createAccessGate({
    store: createPrismaAccessInviteStore(
      db as unknown as Parameters<typeof createPrismaAccessInviteStore>[0],
    ),
    issuerQuota: 1,
  });
}

async function readAccessGateSignupContext(
  request: Request,
): Promise<AccessGateSignupContext | Response | null> {
  if (!isAccessGateEnabled() || !isEmailSignUpRequest(request)) return null;

  const payload = (await request
    .clone()
    .json()
    .catch(() => null)) as {
    email?: unknown;
    accessInviteCode?: unknown;
    inviteCode?: unknown;
    tenantId?: unknown;
  } | null;
  const email = typeof payload?.email === "string" ? payload.email : "";
  const plaintextCode =
    typeof payload?.accessInviteCode === "string"
      ? payload.accessInviteCode
      : typeof payload?.inviteCode === "string"
        ? payload.inviteCode
        : "";

  if (!email.trim() || !plaintextCode.trim()) {
    return Response.json(
      { code: "ACCESS_INVITE_REQUIRED", error: "A valid invite code is required to sign up." },
      { status: 400 },
    );
  }

  const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId.trim() : "";

  return { email, plaintextCode, ...(tenantId ? { tenantId } : {}) };
}

async function enforceAccessGatePreflight(
  context: AccessGateSignupContext | null,
): Promise<Response | null> {
  if (!context) return null;

  try {
    await createAccessGateService().validate({
      plaintextCode: context.plaintextCode,
      email: context.email,
      ...(context.tenantId ? { tenantId: context.tenantId } : {}),
    });
    return null;
  } catch (error) {
    logger.warn("[auth] access-gate signup preflight rejected", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      {
        code: "INVALID_ACCESS_INVITE",
        error: "Invite code is invalid, expired, or not available.",
      },
      { status: 400 },
    );
  }
}

function extractSignedUpUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id === "string") return record.id;
  if (record.user && typeof record.user === "object") {
    const user = record.user as Record<string, unknown>;
    if (typeof user.id === "string") return user.id;
  }
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (typeof data.id === "string") return data.id;
    if (data.user && typeof data.user === "object") {
      const user = data.user as Record<string, unknown>;
      if (typeof user.id === "string") return user.id;
    }
  }
  return null;
}

async function redeemAccessInviteAfterSignup(
  context: AccessGateSignupContext | null,
  response: Response,
): Promise<void> {
  if (!context || response.status < 200 || response.status >= 300) return;

  const payload = await response
    .clone()
    .json()
    .catch(() => null);
  const userId = extractSignedUpUserId(payload);
  if (!userId) {
    logger.warn("[auth] access-gate signup succeeded but response had no user id");
    return;
  }

  try {
    await createAccessGateService().redeem({
      plaintextCode: context.plaintextCode,
      redeemedByUserId: userId,
      email: context.email,
      ...(context.tenantId ? { tenantId: context.tenantId } : {}),
    });
  } catch (error) {
    logger.error("[auth] access-gate post-signup redemption failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

  const accessGateContextOrResponse = await readAccessGateSignupContext(request);
  if (accessGateContextOrResponse instanceof Response) return accessGateContextOrResponse;
  const accessGateContext = accessGateContextOrResponse;
  const accessGateResponse = await enforceAccessGatePreflight(accessGateContext);
  if (accessGateResponse) return accessGateResponse;

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

  response = applySessionHint(request, response);
  await redeemAccessInviteAfterSignup(accessGateContext, response);

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

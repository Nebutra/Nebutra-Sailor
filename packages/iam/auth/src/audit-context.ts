/**
 * @nebutra/auth — Auditable context resolver
 *
 * Maps an incoming HTTP `Request` to the canonical actor/tenant pair used by
 * `@nebutra/audit`. Provider-agnostic: it goes through `createAuth({ provider })`
 * and returns the same shape regardless of the underlying auth system.
 *
 * Application code:
 * ```ts
 * import { auditLogger } from "@nebutra/audit";
 * import { getAuditableContext } from "@nebutra/auth";
 *
 * export async function POST(request: Request) {
 *   // ... handler body ...
 *   const ctx = await getAuditableContext(request);
 *   if (ctx) {
 *     await auditLogger(request, ctx).log({
 *       action: "settings.updated",
 *       outcome: "success",
 *       resource: { type: "settings", id: settingsId },
 *     });
 *   }
 *   return response;
 * }
 * ```
 *
 * Returns `null` for unauthenticated requests so callers can short-circuit
 * without a try/catch.
 */

import { logger } from "@nebutra/logger";
import { createAuth } from "./server";
import type { AuthProvider, AuthProviderId } from "./types";

export interface AuditableActor {
  id: string;
  type: "user" | "system" | "api_key" | "service";
  email?: string;
  name?: string;
}

export interface AuditableContext {
  actor: AuditableActor;
  /** Org id when present, else falls back to user id (account-scoped events). */
  tenantId: string;
  sessionId?: string;
}

let cachedAuth: AuthProvider | null = null;

function resolveProviderId(): AuthProviderId {
  const raw =
    process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
  return raw as AuthProviderId;
}

async function getAuthInstance(): Promise<AuthProvider> {
  if (!cachedAuth) {
    cachedAuth = await createAuth({ provider: resolveProviderId() });
  }
  return cachedAuth;
}

/**
 * Resolve `(actor, tenantId)` from the active session. Returns `null` if the
 * request is unauthenticated. Never throws — failures are logged and treated
 * as "no auditable context".
 *
 * Tenant scoping invariant: every audit event MUST carry a `tenantId`. When
 * the session has no organization (account-level events), we fall back to the
 * user id so the "every row scoped" invariant holds.
 */
export async function getAuditableContext(
  request: Request,
): Promise<AuditableContext | null> {
  try {
    // API-key auth: the gateway middleware sets `x-actor-type=api_key` plus
    // `x-actor-id` once the key is verified. Honor it without re-reading the
    // session for performance and to preserve the actor type.
    const actorType = request.headers.get("x-actor-type");
    const actorId = request.headers.get("x-actor-id");
    const actorTenant = request.headers.get("x-actor-tenant");
    if (actorType === "api_key" && actorId) {
      return {
        actor: { id: actorId, type: "api_key" },
        tenantId: actorTenant ?? actorId,
      };
    }

    const auth = await getAuthInstance();
    const session = await auth.getSession(request);
    if (!session?.userId) return null;

    const tenantId = session.organizationId ?? session.userId;

    return {
      actor: {
        id: session.userId,
        type: "user",
        ...(session.email ? { email: session.email } : {}),
      },
      tenantId,
    };
  } catch (error) {
    logger.warn("[auth] getAuditableContext failed — treating as unauthenticated", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

import { fetchAuthCenterSession } from "@nebutra/auth/auth-center-session";
import { canonicalUserIdOrNull } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import type { Context } from "hono";
import { DOMAINS } from "../config/env.js";

/**
 * Who is calling a personal (non-tenant) route: one answer for every surface
 * that sits behind a person rather than an organization (Studio presets,
 * platform staff).
 *
 * Three ways in, strongest first:
 *   - the tenant middleware already resolved `userId` — a Bearer session it
 *     verified, or an `x-service-token` the admin control plane signed;
 *   - a Bearer token the middleware could not resolve (a CLI device-login
 *     token is an auth-center session the gateway's own lookup does not hold):
 *     ask the auth center, as `nebutra whoami` does;
 *   - from a browser, the auth session cookie on the parent domain.
 *
 * The auth center answers with ITS user id, which is not the key the platform's
 * tables use for anyone who predates it (a staff grant, a tenant, a wallet hang
 * off `users.id`). Both auth-center paths therefore go through the canonical
 * resolver before returning, so every caller gets the app-table key.
 *
 * Returns null for every failure. Callers must not distinguish them.
 */

const log = logger.child({ service: "caller-identity" });

type CallerEnv = { Variables: { tenant?: { userId?: string } } };

export async function resolveCallerUserId(c: Context<CallerEnv>): Promise<string | null> {
  const fromMiddleware = c.get("tenant")?.userId;
  if (fromMiddleware) return fromMiddleware;
  try {
    const authorization = c.req.header("authorization");
    let subject: string | null;
    if (authorization?.startsWith("Bearer ")) {
      subject = await bearerUserId(authorization);
    } else {
      const center = await fetchAuthCenterSession(c.req.raw, DOMAINS.auth);
      const id = center?.user.id;
      subject = typeof id === "string" ? id : null;
    }
    return subject ? await canonicalUserIdOrNull(subject) : null;
  } catch (error) {
    log.warn("auth center unavailable", { error: String(error) });
    return null;
  }
}

async function bearerUserId(authorization: string): Promise<string | null> {
  const res = await fetch(`${DOMAINS.auth.replace(/\/$/, "")}/api/auth/get-session`, {
    headers: { authorization },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { user?: { id?: unknown } } | null;
  return typeof body?.user?.id === "string" ? body.user.id : null;
}

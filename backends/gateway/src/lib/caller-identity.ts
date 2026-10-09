import { fetchAuthCenterSession } from "@nebutra/auth/auth-center-session";
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
 * Returns null for every failure. Callers must not distinguish them.
 */

const log = logger.child({ service: "caller-identity" });

type CallerEnv = { Variables: { tenant?: { userId?: string } } };

export async function resolveCallerUserId(c: Context<CallerEnv>): Promise<string | null> {
  const fromMiddleware = c.get("tenant")?.userId;
  if (fromMiddleware) return fromMiddleware;
  try {
    const authorization = c.req.header("authorization");
    if (authorization?.startsWith("Bearer ")) return await bearerUserId(authorization);
    const center = await fetchAuthCenterSession(c.req.raw, DOMAINS.auth);
    const id = center?.user.id;
    return typeof id === "string" ? id : null;
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

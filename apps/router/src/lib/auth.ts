import "server-only";

import type { Session } from "@nebutra/auth";
import { buildAuthCenterSignInUrl, getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Router auth — provider-agnostic via @nebutra/auth.
 * Default: better-auth (Auth Center). Override with AUTH_PROVIDER / NEXT_PUBLIC_AUTH_PROVIDER.
 */
let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

export async function getAuth() {
  if (!authInstance) {
    const provider = getConfiguredAuthProvider();
    authInstance = await createAuth({ provider });
  }
  return authInstance;
}

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_ROUTER_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3106"
  );
}

export async function buildServerRequest(): Promise<Request> {
  const h = await headers();
  return new Request(appOrigin(), { headers: h });
}

/** Session for Server Components / route handlers. */
export async function getServerSession(): Promise<Session | null> {
  try {
    const auth = await getAuth();
    return await auth.getSession(await buildServerRequest());
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  try {
    const auth = await getAuth();
    return await auth.getSession(request);
  } catch {
    return null;
  }
}

/**
 * Guard admin surfaces (keys / wallet / dashboard).
 * Unauthenticated → Auth Center sign-in with returnTo.
 */
export async function requireAuth(returnPath = "/dashboard"): Promise<Session> {
  const session = await getServerSession();
  if (session?.userId) return session;

  const returnTo = `${appOrigin().replace(/\/+$/, "")}${returnPath.startsWith("/") ? returnPath : `/${returnPath}`}`;
  redirect(buildAuthCenterSignInUrl(returnTo));
}

export function resolveTenantId(opts: {
  explicit?: string | null;
  session?: Session | null;
}): string {
  if (opts.explicit?.trim()) return opts.explicit.trim();
  if (opts.session?.organizationId) return opts.session.organizationId;
  if (opts.session?.userId) return `user:${opts.session.userId}`;
  return "anonymous";
}

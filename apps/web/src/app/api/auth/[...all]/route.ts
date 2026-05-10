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
 */

import type { AuthProvider, AuthProviderId } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";

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

async function handler(request: Request): Promise<Response> {
  if (!PROVIDERS_USING_THIS_ROUTE.has(provider)) {
    // Clerk and other non-routed providers don't use this catch-all.
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const auth = await getAuth();
    const authHandler = auth.middleware();
    const response = await authHandler(request);
    return response ?? new Response(null, { status: 404 });
  } catch (error) {
    logger.error("[auth] API route error:", error);
    return new Response(JSON.stringify({ error: "Internal auth error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const GET = handler;
export const POST = handler;

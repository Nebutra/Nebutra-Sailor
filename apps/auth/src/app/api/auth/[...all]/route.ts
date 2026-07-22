/**
 * Auth-center catch-all — Better Auth / NextAuth surface for all first-party apps.
 * Canonical host: auth.nebutra.com (BETTER_AUTH_URL).
 */

import type { AuthProvider, AuthProviderId } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { applySessionHint } from "@/lib/session-hint";

const PROVIDERS_USING_THIS_ROUTE: ReadonlySet<AuthProviderId> = new Set([
  "better-auth",
  "nextauth",
]);

const provider = getConfiguredAuthProvider();
let authInstance: AuthProvider | null = null;

async function getAuth(): Promise<AuthProvider> {
  if (!authInstance) {
    authInstance = await createAuth({ provider });
  }
  return authInstance;
}

async function handle(request: Request): Promise<Response> {
  if (!PROVIDERS_USING_THIS_ROUTE.has(provider)) {
    return new Response("Auth provider does not use this route", { status: 404 });
  }

  const auth = await getAuth();
  if (!auth.middleware) {
    return new Response("Auth middleware not configured", { status: 500 });
  }

  const response = await auth.middleware(request);
  const url = new URL(request.url);
  return applySessionHint(response, url.pathname, response.status);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

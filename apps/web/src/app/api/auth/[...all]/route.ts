/**
 * Better Auth catch-all API route.
 *
 * Handles all /api/auth/* requests when using Better Auth provider.
 * Delegates to the Better Auth handler which manages:
 * - POST /api/auth/sign-up/email — email/password registration
 * - POST /api/auth/sign-in/email — email/password login
 * - POST /api/auth/sign-out — session termination
 * - GET  /api/auth/session — current session
 * - POST /api/auth/sign-in/social — OAuth redirects
 *
 * When using Clerk, this route is a no-op passthrough.
 */

import type { AuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";

const provider =
  process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

let authInstance: AuthProvider | null = null;

async function getAuth(): Promise<AuthProvider> {
  if (!authInstance) {
    authInstance = await createAuth({ provider: provider as "better-auth" | "clerk" });
  }
  return authInstance;
}

async function handler(request: Request): Promise<Response> {
  if (provider !== "better-auth") {
    // Non-Better Auth providers don't use this route
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const auth = await getAuth();
    // Better Auth's middleware() returns a handler that processes auth API routes
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

/**
 * Provider-agnostic auth webhook router.
 *
 * Routes incoming webhooks to the appropriate provider handler based on
 * the AUTH_PROVIDER environment variable. This allows switching between
 * Clerk, Better Auth, NextAuth, and Supabase without changing route configuration.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";
import { getAuthProvider } from "../../config/env.js";

const log = logger.child({ service: "auth-webhooks" });

/**
 * Create the auth webhook router that delegates to provider-specific handlers.
 */
export async function createAuthWebhookRoutes(): Promise<OpenAPIHono> {
  const app = new OpenAPIHono();
  const provider = getAuthProvider();

  log.info("Creating auth webhook routes", { provider });

  if (provider === "clerk") {
    // Clerk uses Svix for webhook delivery
    const { createClerkWebhookRoutes } = await import("./clerk.js");
    const clerkRoutes = createClerkWebhookRoutes();
    app.route("/", clerkRoutes);
  } else if (provider === "better-auth") {
    // Better Auth uses events API, not traditional webhooks
    const { createBetterAuthWebhookRoutes } = await import("./better-auth-webhooks.js");
    const betterAuthRoutes = createBetterAuthWebhookRoutes();
    app.route("/", betterAuthRoutes);
  } else if (provider === "nextauth") {
    // Auth.js does not own provider webhooks; OAuth/webhook events stay app-specific.
    log.info("NextAuth selected; no auth webhook routes mounted");
  } else if (provider === "supabase") {
    const { createAuth } = await import("@nebutra/auth/server");
    const auth = await createAuth({ provider: "supabase" });
    app.post("/supabase", async (c) => {
      await auth.handleWebhook(c.req.raw);
      return c.json({ ok: true });
    });
  }

  return app;
}

// Singleton instance — lazy-initialized on first use
let authWebhookRoutes: OpenAPIHono | null = null;

/**
 * Get or create the auth webhook router.
 */
export async function getAuthWebhookRoutes(): Promise<OpenAPIHono> {
  if (!authWebhookRoutes) {
    authWebhookRoutes = await createAuthWebhookRoutes();
  }
  return authWebhookRoutes;
}

// Named export for backward compatibility — routes are resolved dynamically
export const authWebhookRoutesPromise = getAuthWebhookRoutes();

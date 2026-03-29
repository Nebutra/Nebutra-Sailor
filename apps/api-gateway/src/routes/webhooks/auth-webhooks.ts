/**
 * Provider-agnostic auth webhook router.
 *
 * Routes incoming webhooks to the appropriate provider handler based on
 * the AUTH_PROVIDER environment variable. This allows switching between
 * Clerk and Better Auth without changing route configuration.
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

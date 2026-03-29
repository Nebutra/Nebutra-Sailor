/**
 * NextAuth webhook handler stub.
 *
 * NextAuth does not use traditional webhooks. Instead, it provides an
 * events/callback system that applications hook into directly. This stub
 * documents the correct approach and provides a placeholder for future
 * webhook support.
 *
 * @see https://next-auth.js.org/configuration/callbacks
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";

const log = logger.child({ service: "nextauth-webhooks" });

const nextAuthWebhookRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Webhooks"],
  summary: "NextAuth event handler (stub)",
  description:
    "NextAuth does not use traditional webhooks. Events are handled via callbacks. " +
    "See: https://next-auth.js.org/configuration/callbacks",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
  },
  responses: {
    501: {
      description: "NextAuth uses callbacks, not webhooks",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

/**
 * Create the NextAuth webhook routes (stub).
 *
 * NextAuth manages user/session lifecycle through callbacks that are
 * invoked directly by NextAuth, not through webhook endpoints. Calling
 * this route is a configuration error.
 */
export function createNextAuthWebhookRoutes(): OpenAPIHono {
  const app = new OpenAPIHono();

  app.openapi(nextAuthWebhookRoute, (c) => {
    log.warn(
      "NextAuth webhook endpoint called — this is not the correct integration path. " +
        "Use callbacks in your NextAuth configuration instead.",
    );

    return c.json(
      {
        message:
          "NextAuth uses callbacks, not webhooks. " +
          "Define callbacks in your NextAuth config. " +
          "See: https://next-auth.js.org/configuration/callbacks",
      },
      501,
    );
  });

  return app;
}

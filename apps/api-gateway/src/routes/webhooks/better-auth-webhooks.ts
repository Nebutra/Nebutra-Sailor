/**
 * Better Auth webhook handler stub.
 *
 * Better Auth does not use traditional webhooks. Instead, it provides an
 * events API that applications hook into directly. This stub documents the
 * correct approach and provides a placeholder for future webhook support.
 *
 * @see https://www.better-auth.com/docs/concepts/events
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";

const log = logger.child({ service: "better-auth-webhooks" });

const betterAuthWebhookRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Webhooks"],
  summary: "Better Auth event handler (stub)",
  description:
    "Better Auth does not use traditional webhooks. Events are handled via the built-in events API. " +
    "See: https://www.better-auth.com/docs/concepts/events",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).catchall(z.any()),
        },
      },
    },
  },
  responses: {
    501: {
      description: "Better Auth uses events API, not webhooks",
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
 * Create the Better Auth webhook routes (stub).
 *
 * Better Auth manages user/organization lifecycle through its built-in
 * events API, which is accessed directly in the application, not through
 * webhook endpoints. Calling this route is a configuration error.
 */
export function createBetterAuthWebhookRoutes(): OpenAPIHono {
  const app = new OpenAPIHono();

  app.openapi(betterAuthWebhookRoute, (c) => {
    log.warn(
      "Better Auth webhook endpoint called — this is not the correct integration path. " +
        "Use the events API directly: await auth.api.listen?.()",
    );

    return c.json(
      {
        message:
          "Better Auth uses events API, not webhooks. " +
          "Hook into events directly in your application. " +
          "See: https://www.better-auth.com/docs/concepts/events",
      },
      501,
    );
  });

  return app;
}

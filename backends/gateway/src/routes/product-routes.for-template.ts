/**
 * Product-line routes — none in a fresh project.
 *
 * Mount your own product's routes here, so app.ts stays the generic gateway.
 */
import type { OpenAPIHono } from "@hono/zod-openapi";

export function mountProductRoutes(_app: OpenAPIHono): void {}

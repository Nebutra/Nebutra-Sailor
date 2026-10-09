/**
 * Product-line routes — Nebutra's own products, mounted on the gateway.
 *
 * The template strips each of these route directories (.templateignore) and
 * `pnpm template:build` puts `product-routes.for-template.ts` in place of this
 * file, so the scaffold's gateway compiles without them. Add a product's
 * routes here, never directly in app.ts.
 */
import type { OpenAPIHono } from "@hono/zod-openapi";
import { agentRuntimeRoutes } from "./agent-runtime/index.js";
import { kcqAiRoutes } from "./kcq/ai.js";
import { kcqRoutes } from "./kcq/index.js";
import { pebbleRoutes } from "./pebble/index.js";
import { startupOsRoutes } from "./startup-os/index.js";

export function mountProductRoutes(app: OpenAPIHono): void {
  app.route("/api/v1/kcq", kcqRoutes);
  // Separate prefix: kcqRoutes' workspace middleware must not run on the AI surface.
  app.route("/api/v1/kcq-ai", kcqAiRoutes);
  app.route("/api/v1/agent-runtime", agentRuntimeRoutes);
  app.route("/api/v1/startup-os", startupOsRoutes);

  // Pebble desktop support intake. Unauthenticated by design (desktop users have
  // no Nebutra account) — the routes carry their own per-IP limits and size caps.
  // `/pebble` is the frozen product namespace so `/v1/*` stays unclaimed for
  // other products; see docs/DOMAINS.md. Mounted with and without the `/api`
  // prefix because the client calls the bare path on api.nebutra.com.
  app.route("/pebble", pebbleRoutes);
  app.route("/api/pebble", pebbleRoutes);
}

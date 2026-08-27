/**
 * /pebble/* — support intake for the Pebble desktop client.
 *
 * These routes are deliberately unauthenticated: Pebble is a desktop app whose
 * users have no platform account, and requiring one would mean nobody could
 * report a crash. Abuse is bounded by per-IP rate limits, exact-size body
 * caps, and short-lived tokens that are bound to a single ticket — not by
 * identity.
 *
 * The `/pebble` prefix is the frozen product namespace on the shared API host:
 * `/v1/*` stays unclaimed so other products can coexist here. See
 * docs/DOMAINS.md and pebble's docs/reference/infra-index.md.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { diagnosticsRoutes } from "./diagnostics.js";
import { feedbackRoutes } from "./feedback.js";

export const pebbleRoutes = new OpenAPIHono();

pebbleRoutes.route("/v1/feedback", feedbackRoutes);
pebbleRoutes.route("/diagnostics", diagnosticsRoutes);

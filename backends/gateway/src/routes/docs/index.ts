import { OpenAPIHono } from "@hono/zod-openapi";
import { docsChatRoutes } from "./chat.js";
import { docsFeedbackRoutes } from "./feedback.js";

/**
 * Public, unauthenticated docs-support endpoints — mounted at
 * `/api/v1/docs` in app.ts. See chat.ts and feedback.ts for what each
 * restores and why it lives here rather than in a docs server.
 */
export const docsRoutes = new OpenAPIHono();
docsRoutes.route("/", docsChatRoutes);
docsRoutes.route("/", docsFeedbackRoutes);

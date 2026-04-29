import { OpenAPIHono } from "@hono/zod-openapi";
import { createQStashWebhookHandler } from "@nebutra/queue";

export const queueDeliveryRoutes = new OpenAPIHono();

const qstashWebhookHandler = createQStashWebhookHandler();

queueDeliveryRoutes.post("/:queue/:type", (c) => qstashWebhookHandler(c.req.raw));

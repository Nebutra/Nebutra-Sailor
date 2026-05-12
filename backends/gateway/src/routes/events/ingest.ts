import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";
import { requireAuth } from "@/middlewares/tenantContext.js";
import { ingestEvents } from "@/services/event-ingest.js";

const eventContextSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().nullish(),
  sessionId: z.string().nullish(),
  utmSource: z.string().nullish(),
  utmMedium: z.string().nullish(),
  utmCampaign: z.string().nullish(),
  experimentId: z.string().nullish(),
  requestId: z.string().nullish(),
  traceId: z.string().nullish(),
  occurredAt: z.union([z.string().min(1), z.date()]),
  contractVersion: z.string().min(1).default("v1"),
});

const eventEnvelopeSchema = z.object({
  eventName: z.string().min(1),
  context: eventContextSchema,
  payload: z.record(z.string(), z.any()).default({}),
  eventId: z.string().min(1).optional(),
  source: z.string().min(1).default("web"),
});

const ingestRequestSchema = z.object({
  events: z.array(eventEnvelopeSchema).min(1).max(1000),
});

const ingestResponseSchema = z.object({
  accepted: z.number().int().nonnegative(),
  duplicated: z.number().int().nonnegative(),
});

export const eventRoutes = new OpenAPIHono();

eventRoutes.use("/ingest", requireAuth);

const ingestRoute = createRoute({
  method: "post",
  path: "/ingest",
  tags: ["Events"],
  summary: "Ingest events",
  description: "Accepts a batch of events (1-1000) and persists them to ClickHouse bronze.",
  request: {
    body: {
      content: { "application/json": { schema: ingestRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Events accepted",
      content: { "application/json": { schema: ingestResponseSchema } },
    },
    400: {
      description: "Tenant mismatch between authenticated context and event payload",
      content: {
        "application/json": {
          schema: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    502: {
      description: "Ingest backend (ClickHouse) unavailable",
      content: {
        "application/json": {
          schema: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
  },
});

eventRoutes.openapi(ingestRoute, async (c) => {
  const payload = c.req.valid("json");
  const tenant = c.get("tenant");

  try {
    const result = await ingestEvents(payload.events, {
      organizationId: tenant?.organizationId,
    });
    return c.json(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("x-organization-id does not match")) {
      return c.json({ error: "Tenant mismatch", message }, 400);
    }

    logger.error("event-ingest: route failed", error as Error);
    return c.json({ error: "Event ingest service unavailable", message }, 502);
  }
});

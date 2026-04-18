import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { env } from "@/config/env.js";
import { requireAuth } from "@/middlewares/tenantContext.js";

const eventContextSchema = z.object({
  tenantId: z.string().min(1),
  occurredAt: z.union([z.string().min(1), z.date()]),
});

const eventEnvelopeSchema = z.object({
  eventName: z.string().min(1),
  context: eventContextSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  eventId: z.string().min(1).optional(),
  source: z.string().min(1).default("web"),
});

const ingestRequestSchema = z.object({
  events: z.array(eventEnvelopeSchema).min(1).max(1000),
});

export const eventRoutes = new OpenAPIHono();

// POST /ingest requires authentication — unauthenticated callers must not
// be able to inject events into the pipeline.
eventRoutes.use("/ingest", requireAuth);

const ingestRoute = createRoute({
  method: "post",
  path: "/ingest",
  tags: ["Events"],
  summary: "Ingest events",
  description:
    "Accepts a batch of events (1-1000) and forwards them to the event ingest service for processing.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ingestRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Events accepted for processing",
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
    502: {
      description: "Event ingest service unavailable",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

// The ingest handler proxies responses from the upstream event service,
// so response status codes are dynamic. We use a type assertion to
// satisfy OpenAPIHono's strict return type while preserving runtime behavior.
eventRoutes.openapi(ingestRoute, async (c) => {
  const payload = c.req.valid("json");
  const tenant = c.get("tenant");
  const serviceUrl = env.EVENT_INGEST_SERVICE_URL ?? "http://localhost:8008";

  // Only trust the tenant resolved by `tenantContextMiddleware` (JWT or S2S+HMAC).
  // Raw request headers MUST NOT override the authenticated context — any client
  // could otherwise spoof another tenant by injecting `x-organization-id` or the
  // legacy `x-tenant-id` header.
  const tenantHeader = tenant?.organizationId;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (tenantHeader) {
    headers["x-organization-id"] = tenantHeader;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(`${serviceUrl}/api/v1/events/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    return c.json(
      {
        error: "Event ingest service unavailable",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      502,
    );
  }

  clearTimeout(timeout);

  const raw = await response.text();
  if (!raw) {
    return c.body(null, response.status as ContentfulStatusCode) as never;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Proxied response — status code is dynamic from upstream service
    return c.json(parsed, response.status as 200) as never;
  } catch {
    return c.text(raw, response.status as ContentfulStatusCode) as never;
  }
});

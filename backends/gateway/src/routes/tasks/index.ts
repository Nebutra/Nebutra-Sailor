/**
 * /api/v1/tasks — standard task envelope proxy.
 *
 * The Worker gateway owns auth, request correlation, and tenant forwarding.
 * The ECS origin owns task persistence/dispatching and can switch store/queue
 * providers without changing the product-facing API.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { toApiError } from "@nebutra/errors";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Context } from "hono";
import { env } from "../../config/env.js";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";
import { aiServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";
import {
  type AuthenticatedAiOriginHeaderInput,
  buildAuthenticatedAiOriginHeaders,
  resolveAiOriginClientIp,
} from "../ai/origin-headers.js";

const tracer = trace.getTracer("api-gateway.tasks");

export const taskRoutes = new OpenAPIHono();
taskRoutes.use("*", requireAuth, requireOrganization);

const JsonRecordSchema = z.record(z.string(), z.unknown());

const TaskCreateRequestSchema = z.object({
  type: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z][a-z0-9_.-]+$/),
  payload: JsonRecordSchema.default({}),
  idempotency_key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_.:-]+$/)
    .optional(),
  queue: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/)
    .default("ai"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  metadata: JsonRecordSchema.default({}),
});

const TaskIdParamsSchema = z.object({
  taskId: z.string().min(1).max(128),
});

function taskOriginUrl(path: string): string {
  if (!env.AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL is required to proxy task origin requests");
  }
  return `${env.AI_SERVICE_URL.replace(/\/$/, "")}${path}`;
}

function originContext(c: Context): AuthenticatedAiOriginHeaderInput {
  const tenant = c.get("tenant");
  const tenantId = tenant?.organizationId ?? tenant?.tenantId;
  if (!tenantId) {
    throw new Error("organization tenant is required to proxy task origin requests");
  }

  return {
    tenantId,
    userId: tenant.userId,
    role: tenant.role,
    plan: tenant.plan,
    requestId: c.get("requestId"),
    clientIp: resolveAiOriginClientIp(c.req.raw.headers),
  };
}

async function proxyToTaskOrigin(
  path: string,
  method: string,
  context: AuthenticatedAiOriginHeaderInput,
  body?: unknown,
): Promise<Response> {
  const headers = await buildAuthenticatedAiOriginHeaders(context);
  return aiServiceBreaker.call(() =>
    fetch(taskOriginUrl(path), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(120_000),
    }),
  );
}

function forwardOriginResponse(upstream: Response): Response {
  const headers = new Headers();
  for (const name of ["content-type", "cache-control", "x-accel-buffering"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function withTaskOrigin(c: Context, spanName: string, fn: () => Promise<Response>) {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const upstream = await fn();
      span.setAttributes({ "http.upstream_status": upstream.status });
      span.setStatus({ code: upstream.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      return forwardOriginResponse(upstream);
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      if (err instanceof CircuitOpenError) {
        return c.json({ error: "Task origin temporarily unavailable — circuit open" }, 503);
      }
      const apiError = toApiError(err);
      return c.json({ error: apiError.error.message }, 503);
    } finally {
      span.end();
    }
  });
}

const createTaskRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Tasks"],
  operationId: "createTask",
  summary: "Create a long-running origin task",
  request: { body: { content: { "application/json": { schema: TaskCreateRequestSchema } } } },
  responses: {
    202: { description: "Task envelope" },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    503: { description: "Task origin unavailable" },
  },
});

taskRoutes.openapi(createTaskRoute, async (c) => {
  const body = c.req.valid("json");
  return withTaskOrigin(c, "tasks.create", () =>
    proxyToTaskOrigin("/api/v1/tasks/", "POST", originContext(c), body),
  );
});

const streamTaskEventsRoute = createRoute({
  method: "get",
  path: "/{taskId}/events",
  tags: ["Tasks"],
  operationId: "streamTaskEvents",
  summary: "Stream task state changes",
  request: { params: TaskIdParamsSchema },
  responses: {
    200: { description: "Server-sent task events" },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    503: { description: "Task origin unavailable" },
  },
});

taskRoutes.openapi(streamTaskEventsRoute, async (c) => {
  const { taskId } = c.req.valid("param");
  return withTaskOrigin(c, "tasks.events", () =>
    proxyToTaskOrigin(
      `/api/v1/tasks/${encodeURIComponent(taskId)}/events`,
      "GET",
      originContext(c),
    ),
  );
});

const cancelTaskRoute = createRoute({
  method: "post",
  path: "/{taskId}/cancel",
  tags: ["Tasks"],
  operationId: "cancelTask",
  summary: "Cancel a long-running origin task",
  request: { params: TaskIdParamsSchema },
  responses: {
    200: { description: "Task envelope" },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    404: { description: "Task not found" },
    503: { description: "Task origin unavailable" },
  },
});

taskRoutes.openapi(cancelTaskRoute, async (c) => {
  const { taskId } = c.req.valid("param");
  return withTaskOrigin(c, "tasks.cancel", () =>
    proxyToTaskOrigin(
      `/api/v1/tasks/${encodeURIComponent(taskId)}/cancel`,
      "POST",
      originContext(c),
    ),
  );
});

const getTaskRoute = createRoute({
  method: "get",
  path: "/{taskId}",
  tags: ["Tasks"],
  operationId: "getTask",
  summary: "Get a task envelope",
  request: { params: TaskIdParamsSchema },
  responses: {
    200: { description: "Task envelope" },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    404: { description: "Task not found" },
    503: { description: "Task origin unavailable" },
  },
});

taskRoutes.openapi(getTaskRoute, async (c) => {
  const { taskId } = c.req.valid("param");
  return withTaskOrigin(c, "tasks.get", () =>
    proxyToTaskOrigin(`/api/v1/tasks/${encodeURIComponent(taskId)}`, "GET", originContext(c)),
  );
});

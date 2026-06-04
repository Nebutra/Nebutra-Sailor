/**
 * /api/v1/uploads — direct object-storage upload metadata proxy.
 *
 * The Worker gateway validates tenant context and forwards metadata calls to
 * the ECS origin. File bytes go directly from the browser to object storage
 * using the origin-issued presigned URL.
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

const tracer = trace.getTracer("api-gateway.uploads");

export const uploadRoutes = new OpenAPIHono();
uploadRoutes.use("*", requireAuth, requireOrganization);

const JsonStringRecordSchema = z.record(z.string(), z.string());
const UploadStatusSchema = z.enum(["pending", "completed", "failed"]);
const PresignedUploadSchema = z.object({
  url: z.string().url(),
  method: z.enum(["PUT", "POST"]),
  headers: JsonStringRecordSchema,
  expires_at: z.string().datetime(),
});
const UploadEnvelopeSchema = z.object({
  id: z.string(),
  status: UploadStatusSchema,
  provider: z.string(),
  bucket: z.string(),
  key: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size: z.number().int(),
  metadata: JsonStringRecordSchema,
  presigned_upload: PresignedUploadSchema.nullable(),
  etag: z.string().nullable(),
  checksum_sha256: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});
const ErrorResponseSchema = z.object({
  error: z.string(),
});

const UploadPresignRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(3).max(255),
  size: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024 * 1024),
  metadata: JsonStringRecordSchema.default({}),
  idempotency_key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_.:-]+$/)
    .optional(),
});

const UploadCompleteRequestSchema = z.object({
  upload_id: z.string().min(1).max(128),
  size: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024 * 1024),
  etag: z.string().max(255).optional(),
  checksum_sha256: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]+$/)
    .optional(),
});

const UploadIdParamsSchema = z.object({
  uploadId: z.string().min(1).max(128),
});

function originUrl(path: string): string {
  if (!env.AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL is required to proxy upload origin requests");
  }
  return `${env.AI_SERVICE_URL.replace(/\/$/, "")}${path}`;
}

function originContext(c: Context): AuthenticatedAiOriginHeaderInput {
  const tenant = c.get("tenant");
  const tenantId = tenant?.organizationId ?? tenant?.tenantId;
  if (!tenantId) {
    throw new Error("organization tenant is required to proxy upload origin requests");
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

async function proxyToUploadOrigin(
  path: string,
  method: string,
  context: AuthenticatedAiOriginHeaderInput,
  body?: unknown,
): Promise<Response> {
  const headers = await buildAuthenticatedAiOriginHeaders(context);
  return aiServiceBreaker.call(() =>
    fetch(originUrl(path), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(120_000),
    }),
  );
}

function forwardOriginResponse(upstream: Response): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function withUploadOrigin(c: Context, spanName: string, fn: () => Promise<Response>) {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const upstream = await fn();
      span.setAttributes({ "http.upstream_status": upstream.status });
      span.setStatus({ code: upstream.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      return forwardOriginResponse(upstream);
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      if (err instanceof CircuitOpenError) {
        return c.json({ error: "Upload origin temporarily unavailable — circuit open" }, 503);
      }
      const apiError = toApiError(err);
      return c.json({ error: apiError.error.message }, 503);
    } finally {
      span.end();
    }
  });
}

const presignRoute = createRoute({
  method: "post",
  path: "/presign",
  tags: ["Uploads"],
  operationId: "presignUpload",
  summary: "Create a direct object-storage upload URL",
  request: { body: { content: { "application/json": { schema: UploadPresignRequestSchema } } } },
  responses: {
    201: {
      description: "Upload metadata with presigned upload instructions",
      content: { "application/json": { schema: UploadEnvelopeSchema } },
    },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    503: {
      description: "Upload origin unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

uploadRoutes.openapi(presignRoute, async (c) => {
  const body = c.req.valid("json");
  return withUploadOrigin(c, "uploads.presign", () =>
    proxyToUploadOrigin("/api/v1/uploads/presign", "POST", originContext(c), body),
  );
});

const completeRoute = createRoute({
  method: "post",
  path: "/complete",
  tags: ["Uploads"],
  operationId: "completeUpload",
  summary: "Mark an object-storage upload complete",
  request: { body: { content: { "application/json": { schema: UploadCompleteRequestSchema } } } },
  responses: {
    200: {
      description: "Upload metadata",
      content: { "application/json": { schema: UploadEnvelopeSchema } },
    },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    404: { description: "Upload not found" },
    503: {
      description: "Upload origin unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

uploadRoutes.openapi(completeRoute, async (c) => {
  const body = c.req.valid("json");
  return withUploadOrigin(c, "uploads.complete", () =>
    proxyToUploadOrigin("/api/v1/uploads/complete", "POST", originContext(c), body),
  );
});

const getUploadRoute = createRoute({
  method: "get",
  path: "/{uploadId}",
  tags: ["Uploads"],
  operationId: "getUpload",
  summary: "Get upload metadata",
  request: { params: UploadIdParamsSchema },
  responses: {
    200: {
      description: "Upload metadata",
      content: { "application/json": { schema: UploadEnvelopeSchema } },
    },
    401: { description: "Authentication required" },
    403: { description: "Organization membership required" },
    404: { description: "Upload not found" },
    503: {
      description: "Upload origin unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

uploadRoutes.openapi(getUploadRoute, async (c) => {
  const { uploadId } = c.req.valid("param");
  return withUploadOrigin(c, "uploads.get", () =>
    proxyToUploadOrigin(`/api/v1/uploads/${encodeURIComponent(uploadId)}`, "GET", originContext(c)),
  );
});

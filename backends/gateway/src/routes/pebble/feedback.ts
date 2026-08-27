/**
 * POST /pebble/v1/feedback — ordinary product feedback, plus legacy crash
 * compatibility for one release cycle of older clients.
 *
 * Accepts both JSON and multipart because shipped clients send both. Reviewed
 * crashes go to Sentry now; this route stores the submission as private support
 * data and never echoes it back into a log line.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { logger } from "@nebutra/logger";
import { getPebbleFeedbackRepository } from "@nebutra/repositories";
import { createIpRateLimit } from "./rate-limit.js";
import { submissionLogFields } from "./redact.js";

const MESSAGE_MAX = 20_000;
const BODY_MAX_BYTES = 256 * 1024;

export const feedbackRoutes = new OpenAPIHono();

feedbackRoutes.use("*", createIpRateLimit(10));

/** Canonical shape after `normalizeFeedbackBody`. */
const FeedbackRequestSchema = z.object({
  submission_id: z.string().min(1).max(191),
  kind: z.enum(["feedback", "crash"]).default("feedback"),
  message: z.string().min(1).max(MESSAGE_MAX),
  contact_email: z.string().email().max(320).optional(),
  app_version: z.string().max(64).optional(),
  platform: z.string().max(32).optional(),
  locale: z.string().max(35).optional(),
});

/**
 * OpenAPI request schema must accept legacy field names; strict validation runs
 * only after `normalizeFeedbackBody` in the handler. If we required
 * `submission_id`/`message` here, shipped desktop clients would get 400 before
 * normalize could synthesize them.
 */
const FeedbackOpenApiBodySchema = z
  .object({
    submission_id: z.string().max(191).optional(),
    kind: z.string().optional(),
    message: z.string().optional(),
    contact_email: z.string().optional(),
    app_version: z.string().optional(),
    platform: z.string().optional(),
    locale: z.string().optional(),
    // Legacy aliases from Tauri clients
    feedback: z.string().optional(),
    submission_type: z.string().optional(),
    github_email: z.string().optional(),
    os_release: z.string().optional(),
    arch: z.string().optional(),
  })
  .passthrough();

const FeedbackResponseSchema = z.object({
  submission_id: z.string(),
  received: z.literal(true),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

/**
 * Multipart fields arrive as strings; coerce the shape rather than branching
 * the whole handler on content type.
 */
function formDataToRecord(form: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") record[key] = value;
  });
  return record;
}

/**
 * Normalize desktop / brand-front legacy payloads onto the canonical schema.
 *
 * Shipped Tauri clients historically POSTed camel-ish / alternate field names
 * to `pebble.nebutra.com/v1/feedback` (now rewritten to this route):
 *   feedback → message
 *   submission_type → kind
 *   github_email → contact_email
 * and often omitted `submission_id`. New clients send the canonical shape
 * directly to `api.nebutra.com/pebble/v1/feedback`.
 */
export function normalizeFeedbackBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...source };

  if (out.message == null && typeof out.feedback === "string") {
    out.message = out.feedback;
  }
  if (out.kind == null && typeof out.submission_type === "string") {
    out.kind = out.submission_type;
  }
  if (out.contact_email == null && typeof out.github_email === "string") {
    out.contact_email = out.github_email;
  }
  if (
    out.submission_id == null ||
    (typeof out.submission_id === "string" && out.submission_id.trim() === "")
  ) {
    out.submission_id = `desk_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return out;
}

const submitRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Pebble"],
  summary: "Submit Pebble feedback",
  description:
    "Unauthenticated support intake for the Pebble desktop client. Idempotent on submission_id.",
  request: {
    body: {
      content: {
        "application/json": { schema: FeedbackOpenApiBodySchema },
        "multipart/form-data": { schema: FeedbackOpenApiBodySchema },
      },
    },
  },
  responses: {
    202: {
      description: "Submission accepted",
      content: { "application/json": { schema: FeedbackResponseSchema } },
    },
    400: {
      description: "Malformed submission",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    413: {
      description: "Body too large",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limited",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

feedbackRoutes.openapi(submitRoute, async (c) => {
  const declaredLength = Number(c.req.header("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > BODY_MAX_BYTES) {
    return c.json({ error: "Payload Too Large", message: "Feedback body exceeds 256 KiB." }, 413);
  }

  const contentType = c.req.header("content-type") ?? "";
  let raw: unknown;

  try {
    // Read through Hono's cached accessors, not `c.req.raw`: the OpenAPI
    // validator has already consumed the raw stream by the time we get here.
    raw = contentType.includes("multipart/form-data")
      ? formDataToRecord(await c.req.formData())
      : await c.req.json();
  } catch {
    return c.json({ error: "Bad Request", message: "Body is not valid JSON or form data." }, 400);
  }

  const parsed = FeedbackRequestSchema.safeParse(normalizeFeedbackBody(raw));
  if (!parsed.success) {
    return c.json({ error: "Bad Request", message: "Submission failed validation." }, 400);
  }

  const input = parsed.data;

  await getPebbleFeedbackRepository().record({
    submissionId: input.submission_id,
    kind: input.kind === "crash" ? "CRASH" : "FEEDBACK",
    message: input.message,
    contactEmail: input.contact_email ?? null,
    appVersion: input.app_version ?? null,
    platform: input.platform ?? null,
    locale: input.locale ?? null,
  });

  // Message and contact address are intentionally absent from this line.
  logger.info(
    "Pebble feedback received",
    submissionLogFields({
      submissionId: input.submission_id,
      appVersion: input.app_version,
      platform: input.platform,
      bytes: input.message.length,
    }),
  );

  return c.json({ submission_id: input.submission_id, received: true as const }, 202);
});

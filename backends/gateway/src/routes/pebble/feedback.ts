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

const FeedbackRequestSchema = z.object({
  submission_id: z.string().min(1).max(191),
  kind: z.enum(["feedback", "crash"]).default("feedback"),
  message: z.string().min(1).max(MESSAGE_MAX),
  contact_email: z.string().email().max(320).optional(),
  app_version: z.string().max(64).optional(),
  platform: z.string().max(32).optional(),
  locale: z.string().max(35).optional(),
});

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
        "application/json": { schema: FeedbackRequestSchema },
        "multipart/form-data": { schema: FeedbackRequestSchema },
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

  const parsed = FeedbackRequestSchema.safeParse(raw);
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

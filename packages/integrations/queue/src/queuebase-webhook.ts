import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { invitationCleanup, sessionCleanup } from "./scheduled";

export type QueuebaseBackoff = "fixed" | "exponential" | "linear";

export interface QueuebaseScheduleConfig {
  cron: string;
  timezone?: string;
  overlap?: "allow" | "skip";
}

export type QueuebaseSchedule = string | QueuebaseScheduleConfig;

export interface QueuebaseJobContext<TInput> {
  input: TInput;
  jobId: string;
  attempt: number;
  maxAttempts: number;
  fail: (reason: string) => never;
}

export interface QueuebaseJobDefinition<
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TResult = unknown,
> {
  input: TSchema;
  handler: (context: QueuebaseJobContext<z.output<TSchema>>) => Promise<TResult> | TResult;
  defaults?: {
    retries?: number;
    backoff?: QueuebaseBackoff;
  };
  schedule?: QueuebaseSchedule;
}

export type QueuebaseJobRouter = Record<string, QueuebaseJobDefinition>;

export interface QueuebaseWebhookOptions {
  webhookSecret?: string;
  signatureHeader?: string;
}

export interface QueuebaseScheduleMetadata {
  name: string;
  schedule: QueuebaseSchedule;
}

interface QueuebaseWebhookPayload {
  jobName?: unknown;
  name?: unknown;
  type?: unknown;
  input?: unknown;
  payload?: unknown;
  jobId?: unknown;
  id?: unknown;
  attempt?: unknown;
  maxAttempts?: unknown;
}

class QueuebaseFailure extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "QueuebaseFailure";
  }
}

export function defineQueueJob<TSchema extends z.ZodTypeAny, TResult>(
  definition: QueuebaseJobDefinition<TSchema, TResult>,
): QueuebaseJobDefinition<TSchema, TResult> {
  return definition;
}

export function createJobRouter<TRouter extends QueuebaseJobRouter>(router: TRouter): TRouter {
  return router;
}

export function createQueuebaseWebhookHandler<TRouter extends QueuebaseJobRouter>(
  router: TRouter,
  options: QueuebaseWebhookOptions = {},
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.text();
    const signatureHeader = options.signatureHeader ?? "x-queuebase-signature";
    const secret = options.webhookSecret;
    if (secret && !verifyQueuebaseSignature(body, request.headers.get(signatureHeader), secret)) {
      return Response.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: QueuebaseWebhookPayload;
    try {
      payload = JSON.parse(body) as QueuebaseWebhookPayload;
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const jobName = readString(payload.jobName ?? payload.name ?? payload.type);
    if (!jobName) {
      return Response.json({ ok: false, error: "Missing jobName" }, { status: 400 });
    }

    const definition = router[jobName];
    if (!definition) {
      return Response.json(
        { ok: false, jobName, error: `Unknown job '${jobName}'` },
        { status: 404 },
      );
    }

    const parsed = definition.input.safeParse(payload.input ?? payload.payload ?? {});
    if (!parsed.success) {
      return Response.json(
        { ok: false, jobName, error: `Invalid input for job ${jobName}: ${parsed.error.message}` },
        { status: 400 },
      );
    }

    const jobId = readString(payload.jobId ?? payload.id) ?? crypto.randomUUID();
    const attempt = readNumber(payload.attempt) ?? 1;
    const maxAttempts = readNumber(payload.maxAttempts) ?? definition.defaults?.retries ?? 1;

    try {
      const result = await definition.handler({
        input: parsed.data,
        jobId,
        attempt,
        maxAttempts,
        fail: (reason: string) => {
          throw new QueuebaseFailure(reason);
        },
      });
      return Response.json({ ok: true, jobName, result });
    } catch (error) {
      const message =
        error instanceof QueuebaseFailure
          ? error.reason
          : error instanceof Error
            ? error.message
            : String(error);
      return Response.json({ ok: false, jobName, error: message }, { status: 500 });
    }
  };
}

export function listQueuebaseSchedules<TRouter extends QueuebaseJobRouter>(
  router: TRouter,
): QueuebaseScheduleMetadata[] {
  return Object.entries(router)
    .filter(
      (entry): entry is [string, QueuebaseJobDefinition & { schedule: QueuebaseSchedule }] => {
        return entry[1].schedule !== undefined;
      },
    )
    .map(([name, definition]) => ({ name, schedule: definition.schedule }));
}

export const queuebaseJobs = createJobRouter({
  invitationCleanup: defineQueueJob({
    input: z.object({}),
    schedule: { cron: invitationCleanup.cron, timezone: "UTC", overlap: "skip" },
    handler: async () => invitationCleanup.handler(),
  }),
  sessionCleanup: defineQueueJob({
    input: z.object({}),
    schedule: { cron: sessionCleanup.cron, timezone: "UTC", overlap: "skip" },
    handler: async () => sessionCleanup.handler(),
  }),
});

export type QueuebaseJobs = typeof queuebaseJobs;

export const queuebaseWebhookHandler = createQueuebaseWebhookHandler(queuebaseJobs, {
  ...(process.env.QUEUEBASE_WEBHOOK_SECRET
    ? { webhookSecret: process.env.QUEUEBASE_WEBHOOK_SECRET }
    : {}),
});

export function verifyQueuebaseSignature(
  body: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const raw = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
  if (!/^[a-f0-9]{64}$/i.test(raw)) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const actualBuffer = Buffer.from(raw, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

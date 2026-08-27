import { logger } from "@nebutra/logger";
import { Client } from "@upstash/qstash";
import type {
  DeadLetterJob,
  JobHandler,
  JobPayload,
  JobResult,
  QStashProviderConfig,
  QueueDeadLetterFetcher,
  QueueDeadLetterRecord,
  QueueProvider,
} from "../types";
import { JobPayloadSchema } from "../types";

// =============================================================================
// QStash Provider — Upstash serverless message queue
// =============================================================================
// QStash works by POSTing job payloads to your API endpoints.
// You register HTTP route handlers (e.g. /api/queue/:type) that QStash calls.
//
// Architecture:
//   enqueue()  →  QStash API (publish)  →  HTTP POST to callbackBaseUrl/api/queue/:type
//   Your API route verifies the QStash signature and processes the job.
// =============================================================================

/**
 * Handlers registered via `registerHandler` are stored here so the
 * HTTP verification middleware can look them up at request time.
 */
const handlerRegistry = new Map<string, JobHandler>();

/**
 * Get a registered handler by its composite key (`queue:type`).
 * Used by the QStash webhook verification middleware.
 */
export function getQStashHandler(queue: string, type: string): JobHandler | undefined {
  return handlerRegistry.get(`${queue}:${type}`);
}

/**
 * Get ALL registered handlers (for introspection / health checks).
 */
export function getQStashHandlerKeys(): string[] {
  return [...handlerRegistry.keys()];
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value)) return readString(value[0]);
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const entries = Object.entries(headers as Record<string, unknown>);
  const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
  return match ? readString(match[1]) : undefined;
}

function parseOriginalJob(record: QueueDeadLetterRecord): JobPayload | undefined {
  const rawBody = readString(record.body);
  if (!rawBody) return undefined;

  try {
    return JobPayloadSchema.parse(JSON.parse(rawBody));
  } catch {
    return undefined;
  }
}

function readFailedAt(record: QueueDeadLetterRecord): string {
  const failedAt = readString(record.failedAt) ?? readString(record.time);
  if (failedAt) return failedAt;

  const timestamp =
    readNumber(record.failedAt) ?? readNumber(record.time) ?? readNumber(record.createdAt);
  return timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function readFailedReason(record: QueueDeadLetterRecord): string {
  return (
    readString(record.failedReason) ??
    readString(record.error) ??
    readString(record.responseBody) ??
    (readNumber(record.responseStatus) ? `HTTP ${readNumber(record.responseStatus)}` : undefined) ??
    "QStash delivery failed"
  );
}

export function toQStashDeadLetterJob(record: QueueDeadLetterRecord): DeadLetterJob | undefined {
  const originalJob = parseOriginalJob(record);
  if (!originalJob) return undefined;

  const headerJobId = readHeader(record.header, "x-nebutra-job-id");
  const headerJobType = readHeader(record.header, "x-nebutra-job-type");
  const maxRetries = readNumber(record.maxRetries) ?? originalJob.options?.maxRetries ?? 0;

  return {
    id: originalJob.id || headerJobId || readString(record.messageId) || "unknown",
    queue: originalJob.queue,
    type: originalJob.type || headerJobType || "unknown",
    originalJob,
    attempts: readNumber(record.attempts) ?? maxRetries + 1,
    maxRetries,
    failedReason: readFailedReason(record),
    provider: "qstash",
    failedAt: readFailedAt(record),
  };
}

export class QStashProvider implements QueueProvider {
  readonly name = "qstash" as const;

  private client: Client;
  private callbackBaseUrl: string;
  private token: string;
  private dlqEndpoint: string | undefined;
  private dlqFetcher: QueueDeadLetterFetcher | undefined;

  constructor(config: Omit<QStashProviderConfig, "provider">) {
    const token = config.token ?? process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error(
        "QStash token not configured. Set QSTASH_TOKEN env var or pass `token` in config.",
      );
    }

    this.token = token;
    this.client = new Client({ token });
    this.callbackBaseUrl = config.callbackBaseUrl.replace(/\/$/, "");
    this.dlqEndpoint = config.dlqEndpoint;
    this.dlqFetcher = config.dlqFetcher;

    logger.info("[queue:qstash] Provider initialised", {
      callbackBaseUrl: this.callbackBaseUrl,
    });
  }

  // ── Enqueue ─────────────────────────────────────────────────────────────

  async enqueue(job: JobPayload): Promise<JobResult> {
    const destination = `${this.callbackBaseUrl}/api/queue/${job.queue}/${job.type}`;

    try {
      const response = await this.client.publishJSON({
        url: destination,
        body: job,
        ...(job.options?.idempotencyKey !== undefined
          ? { deduplicationId: job.options.idempotencyKey }
          : {}),
        ...(job.options?.delaySec ? { delay: job.options.delaySec } : {}),
        retries: job.options?.maxRetries ?? 3,
        ...(job.options?.cron ? { cron: job.options.cron } : {}),
        headers: {
          "x-nebutra-queue": job.queue,
          "x-nebutra-job-type": job.type,
          "x-nebutra-job-id": job.id,
          ...(job.options?.tenantId ? { "x-nebutra-tenant-id": job.options.tenantId } : {}),
        },
      });

      const messageId = "messageId" in response ? response.messageId : job.id;

      logger.info("[queue:qstash] Job enqueued", {
        jobId: job.id,
        messageId,
        destination,
      });

      return {
        jobId: messageId,
        accepted: true,
        provider: "qstash",
      };
    } catch (error) {
      logger.error("[queue:qstash] Failed to enqueue job", {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async enqueueBatch(jobs: JobPayload[]): Promise<JobResult[]> {
    // QStash supports batch publish — use it for efficiency
    try {
      const messages = jobs.map((job) => ({
        url: `${this.callbackBaseUrl}/api/queue/${job.queue}/${job.type}`,
        body: JSON.stringify(job),
        headers: {
          "Content-Type": "application/json",
          "x-nebutra-queue": job.queue,
          "x-nebutra-job-type": job.type,
          "x-nebutra-job-id": job.id,
          ...(job.options?.tenantId ? { "x-nebutra-tenant-id": job.options.tenantId } : {}),
        },
        ...(job.options?.idempotencyKey !== undefined
          ? { deduplicationId: job.options.idempotencyKey }
          : {}),
        retries: job.options?.maxRetries ?? 3,
      }));

      const responses = await this.client.batchJSON(messages);

      logger.info("[queue:qstash] Batch enqueued", { count: jobs.length });

      return responses.map((r, idx) => ({
        jobId: "messageId" in r ? r.messageId : (jobs[idx]?.id ?? ""),
        accepted: true,
        provider: "qstash" as const,
      }));
    } catch (error) {
      logger.error("[queue:qstash] Batch enqueue failed, falling back to sequential", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: sequential enqueue
      const results: JobResult[] = [];
      for (const job of jobs) {
        results.push(await this.enqueue(job));
      }
      return results;
    }
  }

  // ── Handler Registration ────────────────────────────────────────────────

  registerHandler<T extends Record<string, unknown>>(
    queue: string,
    type: string,
    handler: JobHandler<T>,
  ): void {
    const key = `${queue}:${type}`;
    handlerRegistry.set(key, handler as JobHandler);
    logger.info("[queue:qstash] Handler registered", { key });
  }

  async getDeadLetteredJobs(queue?: string): Promise<DeadLetterJob[]> {
    if (!this.dlqFetcher) {
      logger.warn("[queue:qstash] DLQ fetcher not configured; returning empty dead-letter list");
      return [];
    }

    try {
      const records = await this.dlqFetcher({
        token: this.token,
        ...(this.dlqEndpoint !== undefined ? { endpoint: this.dlqEndpoint } : {}),
        ...(queue !== undefined ? { queue } : {}),
      });

      return records
        .map(toQStashDeadLetterJob)
        .filter((job): job is DeadLetterJob => Boolean(job))
        .filter((job) => queue === undefined || job.queue === queue);
    } catch (error) {
      logger.error("[queue:qstash] Failed to fetch dead-letter jobs", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    handlerRegistry.clear();
    logger.info("[queue:qstash] Provider closed");
  }
}

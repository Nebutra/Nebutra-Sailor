import { logger } from "@nebutra/logger";
import { Client } from "@upstash/qstash";
import type {
  JobHandler,
  JobPayload,
  JobResult,
  QStashProviderConfig,
  QueueProvider,
} from "../types.js";

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

export class QStashProvider implements QueueProvider {
  readonly name = "qstash" as const;

  private client: Client;
  private callbackBaseUrl: string;

  constructor(config: Omit<QStashProviderConfig, "provider">) {
    const token = config.token ?? process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error(
        "QStash token not configured. Set QSTASH_TOKEN env var or pass `token` in config.",
      );
    }

    this.client = new Client({ token });
    this.callbackBaseUrl = config.callbackBaseUrl.replace(/\/$/, "");

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

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    handlerRegistry.clear();
    logger.info("[queue:qstash] Provider closed");
  }
}

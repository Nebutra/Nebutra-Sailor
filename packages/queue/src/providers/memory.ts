import { logger } from "@nebutra/logger";
import type { JobHandler, JobPayload, JobResult, JobStatusInfo, QueueProvider } from "../types.js";

// =============================================================================
// Memory Provider — in-memory queue for local dev & testing
// =============================================================================
// Processes jobs inline (synchronously after enqueue) with no persistence.
// NOT for production — use QStash or BullMQ instead.
//
// Useful for:
//   - Unit tests that need queue behaviour without Redis/QStash
//   - Local dev when you don't want to run Docker
//   - CI pipelines
// =============================================================================

interface StoredJob {
  payload: JobPayload;
  status: "pending" | "active" | "completed" | "failed";
  attempts: number;
  failedReason?: string;
  processedAt?: string;
  completedAt?: string;
}

export class MemoryProvider implements QueueProvider {
  readonly name = "memory" as const;

  private handlers: Map<string, JobHandler> = new Map();
  private jobs: Map<string, StoredJob> = new Map();
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    logger.info("[queue:memory] Provider initialised (dev/test only)");
  }

  // ── Enqueue ─────────────────────────────────────────────────────────────

  async enqueue(job: JobPayload): Promise<JobResult> {
    this.jobs.set(job.id, {
      payload: job,
      status: "pending",
      attempts: 0,
    });

    const delaySec = job.options?.delaySec ?? 0;

    if (delaySec > 0) {
      const timer = setTimeout(() => this.processJob(job), delaySec * 1000);
      this.timers.push(timer);
    } else {
      // Process on next tick to simulate async behaviour
      const timer = setTimeout(() => this.processJob(job), 0);
      this.timers.push(timer);
    }

    return {
      jobId: job.id,
      accepted: true,
      provider: "memory",
    };
  }

  async enqueueBatch(jobs: JobPayload[]): Promise<JobResult[]> {
    const results: JobResult[] = [];
    for (const job of jobs) {
      results.push(await this.enqueue(job));
    }
    return results;
  }

  // ── Handler Registration ────────────────────────────────────────────────

  registerHandler<T extends Record<string, unknown>>(
    queue: string,
    type: string,
    handler: JobHandler<T>,
  ): void {
    const key = `${queue}:${type}`;
    this.handlers.set(key, handler as JobHandler);
    logger.info("[queue:memory] Handler registered", { key });
  }

  // ── Job Status ──────────────────────────────────────────────────────────

  async getJobStatus(jobId: string): Promise<JobStatusInfo | undefined> {
    const stored = this.jobs.get(jobId);
    if (!stored) return undefined;

    return {
      id: jobId,
      queue: stored.payload.queue,
      status: stored.status,
      attempts: stored.attempts,
      maxRetries: stored.payload.options?.maxRetries ?? 3,
      ...(stored.failedReason !== undefined ? { failedReason: stored.failedReason } : {}),
      createdAt: stored.payload.createdAt,
      ...(stored.processedAt !== undefined ? { processedAt: stored.processedAt } : {}),
      ...(stored.completedAt !== undefined ? { completedAt: stored.completedAt } : {}),
    };
  }

  // ── Internal Processing ─────────────────────────────────────────────────

  private async processJob(job: JobPayload): Promise<void> {
    const key = `${job.queue}:${job.type}`;
    const handler = this.handlers.get(key);

    const stored = this.jobs.get(job.id);
    if (!stored) return;

    if (!handler) {
      logger.warn("[queue:memory] No handler for job type", { key, jobId: job.id });
      stored.status = "failed";
      stored.failedReason = `No handler registered for ${key}`;
      return;
    }

    const maxRetries = job.options?.maxRetries ?? 3;

    stored.status = "active";
    stored.processedAt = new Date().toISOString();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      stored.attempts = attempt;
      try {
        await handler(job);
        stored.status = "completed";
        stored.completedAt = new Date().toISOString();
        logger.info("[queue:memory] Job completed", { jobId: job.id, key });
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn("[queue:memory] Job attempt failed", {
          jobId: job.id,
          attempt,
          maxRetries,
          error: msg,
        });

        if (attempt === maxRetries) {
          stored.status = "failed";
          stored.failedReason = msg;
          logger.error("[queue:memory] Job exhausted retries", {
            jobId: job.id,
            key,
          });
        }
      }
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
    this.handlers.clear();
    this.jobs.clear();
    logger.info("[queue:memory] Provider closed");
  }
}

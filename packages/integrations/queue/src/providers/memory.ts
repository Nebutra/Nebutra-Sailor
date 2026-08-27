import { logger } from "@nebutra/logger";
import type {
  DeadLetterJob,
  JobHandler,
  JobLifecycleAction,
  JobLifecycleActionResult,
  JobLifecycleEvent,
  JobPayload,
  JobResult,
  JobStatusInfo,
  QueueProvider,
} from "../types";

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
  status: "pending" | "active" | "completed" | "failed" | "dead-lettered" | "delayed" | "canceled";
  attempts: number;
  failedReason?: string | undefined;
  canceledReason?: string | undefined;
  processedAt?: string | undefined;
  completedAt?: string | undefined;
  deadLetteredAt?: string | undefined;
  canceledAt?: string | undefined;
  logs: JobLifecycleEvent[];
  timer?: ReturnType<typeof setTimeout> | undefined;
}

export class MemoryProvider implements QueueProvider {
  readonly name = "memory" as const;

  private handlers: Map<string, JobHandler> = new Map();
  private jobs: Map<string, StoredJob> = new Map();
  private deadLetters: Map<string, DeadLetterJob> = new Map();
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    logger.info("[queue:memory] Provider initialised (dev/test only)");
  }

  // ── Enqueue ─────────────────────────────────────────────────────────────

  async enqueue(job: JobPayload): Promise<JobResult> {
    const delaySec = job.options?.delaySec ?? 0;

    this.jobs.set(job.id, {
      payload: job,
      status: delaySec > 0 ? "delayed" : "pending",
      attempts: 0,
      logs: [],
    });
    this.appendLog(job, "enqueued", {
      ...(delaySec > 0 ? { metadata: { delaySec } } : {}),
    });

    if (delaySec > 0) {
      const timer = setTimeout(() => this.processJob(job), delaySec * 1000);
      this.trackTimer(job.id, timer);
    } else {
      // Process on next tick to simulate async behaviour
      const timer = setTimeout(() => this.processJob(job), 0);
      this.trackTimer(job.id, timer);
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

  async getJobStatus(jobId: string, _queue?: string): Promise<JobStatusInfo | undefined> {
    const stored = this.jobs.get(jobId);
    if (!stored) return undefined;

    return {
      id: jobId,
      queue: stored.payload.queue,
      status: stored.status,
      attempts: stored.attempts,
      maxRetries: stored.payload.options?.maxRetries ?? 3,
      ...(stored.failedReason !== undefined ? { failedReason: stored.failedReason } : {}),
      ...(stored.canceledReason !== undefined ? { canceledReason: stored.canceledReason } : {}),
      createdAt: stored.payload.createdAt,
      ...(stored.processedAt !== undefined ? { processedAt: stored.processedAt } : {}),
      ...(stored.completedAt !== undefined ? { completedAt: stored.completedAt } : {}),
      ...(stored.deadLetteredAt !== undefined ? { deadLetteredAt: stored.deadLetteredAt } : {}),
      ...(stored.canceledAt !== undefined ? { canceledAt: stored.canceledAt } : {}),
    };
  }

  async getDeadLetteredJobs(queue?: string): Promise<DeadLetterJob[]> {
    const jobs = [...this.deadLetters.values()];
    return queue === undefined ? jobs : jobs.filter((job) => job.queue === queue);
  }

  async getJobLogs(jobId: string, _queue: string): Promise<JobLifecycleEvent[]> {
    return [...(this.jobs.get(jobId)?.logs ?? [])];
  }

  async cancelJob(
    jobId: string,
    queue: string,
    reason = "canceled",
  ): Promise<JobLifecycleActionResult> {
    const stored = this.jobs.get(jobId);
    if (!stored || stored.payload.queue !== queue) {
      return { jobId, queue, accepted: false, action: "cancel", reason: "Job not found" };
    }

    if (!["pending", "delayed"].includes(stored.status)) {
      return { jobId, queue, accepted: false, action: "cancel", reason: `Job is ${stored.status}` };
    }

    if (stored.timer) {
      clearTimeout(stored.timer);
      this.timers = this.timers.filter((timer) => timer !== stored.timer);
      stored.timer = undefined;
    }

    const canceledAt = new Date().toISOString();
    stored.status = "canceled";
    stored.canceledReason = reason;
    stored.canceledAt = canceledAt;
    this.appendLog(stored.payload, "canceled", { reason });

    return { jobId, queue, accepted: true, action: "cancel", reason };
  }

  async retryJob(
    jobId: string,
    queue: string,
    reason = "manual-retry",
  ): Promise<JobLifecycleActionResult> {
    const stored = this.jobs.get(jobId);
    if (!stored || stored.payload.queue !== queue) {
      return { jobId, queue, accepted: false, action: "retry", reason: "Job not found" };
    }

    if (!["failed", "dead-lettered", "canceled"].includes(stored.status)) {
      return { jobId, queue, accepted: false, action: "retry", reason: `Job is ${stored.status}` };
    }

    stored.status = "pending";
    stored.attempts = 0;
    stored.failedReason = undefined;
    stored.canceledReason = undefined;
    stored.processedAt = undefined;
    stored.completedAt = undefined;
    stored.deadLetteredAt = undefined;
    stored.canceledAt = undefined;
    this.deadLetters.delete(jobId);
    this.appendLog(stored.payload, "retried", { reason });

    const timer = setTimeout(() => this.processJob(stored.payload), 0);
    this.trackTimer(jobId, timer);

    return { jobId, queue, accepted: true, action: "retry", reason };
  }

  // ── Internal Processing ─────────────────────────────────────────────────

  private async processJob(job: JobPayload): Promise<void> {
    const key = `${job.queue}:${job.type}`;
    const handler = this.handlers.get(key);

    const stored = this.jobs.get(job.id);
    if (!stored) return;
    stored.timer = undefined;

    if (stored.status === "canceled") {
      logger.info("[queue:memory] Skipping canceled job", { jobId: job.id, key });
      return;
    }

    if (!handler) {
      logger.warn("[queue:memory] No handler for job type", { key, jobId: job.id });
      stored.status = "failed";
      stored.failedReason = `No handler registered for ${key}`;
      this.appendLog(job, "failed", { reason: stored.failedReason });
      return;
    }

    const maxRetries = job.options?.maxRetries ?? 3;

    stored.status = "active";
    stored.processedAt = new Date().toISOString();
    this.appendLog(job, "started");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      stored.attempts = attempt;
      try {
        await handler(job);
        stored.status = "completed";
        stored.completedAt = new Date().toISOString();
        this.appendLog(job, "completed", { attempt });
        logger.info("[queue:memory] Job completed", { jobId: job.id, key });
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.appendLog(job, "attempt-failed", { attempt, reason: msg });
        logger.warn("[queue:memory] Job attempt failed", {
          jobId: job.id,
          attempt,
          maxRetries,
          error: msg,
        });

        if (attempt === maxRetries) {
          this.deadLetter(job, stored, msg, maxRetries);
          logger.error("[queue:memory] Job exhausted retries", {
            jobId: job.id,
            key,
          });
        }
      }
    }
  }

  private deadLetter(
    job: JobPayload,
    stored: StoredJob,
    failedReason: string,
    maxRetries: number,
  ): void {
    const failedAt = new Date().toISOString();
    stored.status = "dead-lettered";
    stored.failedReason = failedReason;
    stored.deadLetteredAt = failedAt;
    this.appendLog(job, "dead-lettered", { reason: failedReason });
    this.deadLetters.set(job.id, {
      id: job.id,
      queue: job.queue,
      type: job.type,
      originalJob: job,
      attempts: stored.attempts,
      maxRetries,
      failedReason,
      provider: "memory",
      failedAt,
    });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
    this.handlers.clear();
    this.jobs.clear();
    this.deadLetters.clear();
    logger.info("[queue:memory] Provider closed");
  }

  private trackTimer(jobId: string, timer: ReturnType<typeof setTimeout>): void {
    this.timers.push(timer);
    const stored = this.jobs.get(jobId);
    if (stored) stored.timer = timer;
  }

  private appendLog(
    job: JobPayload,
    action: JobLifecycleAction,
    details: Pick<JobLifecycleEvent, "attempt" | "reason" | "actor" | "metadata"> = {},
  ): void {
    const stored = this.jobs.get(job.id);
    if (!stored) return;

    stored.logs.push({
      id: `log_${crypto.randomUUID()}`,
      jobId: job.id,
      queue: job.queue,
      action,
      at: new Date().toISOString(),
      ...details,
    });
  }
}

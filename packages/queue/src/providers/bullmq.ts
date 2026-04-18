import { logger } from "@nebutra/logger";
import { type Job as BullJob, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type {
  BullMQProviderConfig,
  JobHandler,
  JobPayload,
  JobResult,
  JobStatus,
  JobStatusInfo,
  QueueProvider,
} from "../types";

// =============================================================================
// BullMQ Provider — self-hosted Redis queue backend
// =============================================================================
// Uses BullMQ (the successor to Bull) for job queuing over a standard Redis
// instance. Ideal for customers who self-host Redis or need features like
// priority queues, rate limiting, and the Bull Board dashboard.
//
// Architecture:
//   enqueue()        →  Redis LPUSH via BullMQ Queue
//   registerHandler  →  BullMQ Worker (long-polling BRPOPLPUSH)
//   getJobStatus     →  Redis HGET on the job hash
// =============================================================================

export class BullMQProvider implements QueueProvider {
  readonly name = "bullmq" as const;

  private connection: IORedis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private prefix: string;
  private concurrency: number;

  constructor(config: Omit<BullMQProviderConfig, "provider">) {
    const redisUrl = config.redisUrl ?? process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error(
        "Redis URL not configured. Set REDIS_URL env var or pass `redisUrl` in config.",
      );
    }

    this.prefix = config.prefix ?? "nebutra:queue";
    this.concurrency = config.concurrency ?? 5;

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    this.connection.on("error", (err) => {
      logger.error("[queue:bullmq] Redis connection error", {
        error: err.message,
      });
    });

    logger.info("[queue:bullmq] Provider initialised", {
      prefix: this.prefix,
      concurrency: this.concurrency,
    });
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, {
        connection: this.connection.duplicate() as any,
        prefix: this.prefix,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      });
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  // ── Enqueue ─────────────────────────────────────────────────────────────

  async enqueue(job: JobPayload): Promise<JobResult> {
    const queue = this.getOrCreateQueue(job.queue);

    try {
      const bullJob = await queue.add(job.type, job, {
        jobId: job.id,
        ...(job.options?.delaySec ? { delay: job.options.delaySec * 1000 } : {}),
        attempts: job.options?.maxRetries ?? 3,
        ...(job.options?.priority !== undefined ? { priority: job.options.priority } : {}),
        ...(job.options?.cron ? { repeat: { pattern: job.options.cron } } : {}),
      });

      logger.info("[queue:bullmq] Job enqueued", {
        jobId: bullJob.id,
        queue: job.queue,
        type: job.type,
      });

      return {
        jobId: bullJob.id ?? job.id,
        accepted: true,
        provider: "bullmq",
      };
    } catch (error) {
      logger.error("[queue:bullmq] Failed to enqueue job", {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async enqueueBatch(jobs: JobPayload[]): Promise<JobResult[]> {
    // Group jobs by queue name for efficient bulk add
    const grouped = new Map<string, JobPayload[]>();
    for (const job of jobs) {
      const list = grouped.get(job.queue) ?? [];
      list.push(job);
      grouped.set(job.queue, list);
    }

    const results: JobResult[] = [];

    for (const [queueName, queueJobs] of grouped) {
      const queue = this.getOrCreateQueue(queueName);

      const bulkData = queueJobs.map((job) => ({
        name: job.type,
        data: job,
        opts: {
          jobId: job.id,
          ...(job.options?.delaySec ? { delay: job.options.delaySec * 1000 } : {}),
          attempts: job.options?.maxRetries ?? 3,
          ...(job.options?.priority !== undefined ? { priority: job.options.priority } : {}),
        },
      }));

      const bullJobs = await queue.addBulk(bulkData);

      for (let i = 0; i < bullJobs.length; i++) {
        results.push({
          jobId: bullJobs[i]?.id ?? queueJobs[i]!.id,
          accepted: true,
          provider: "bullmq",
        });
      }
    }

    logger.info("[queue:bullmq] Batch enqueued", { count: jobs.length });
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

    // Create or update the worker for this queue
    this.ensureWorker(queue);

    logger.info("[queue:bullmq] Handler registered", { key });
  }

  private ensureWorker(queueName: string): void {
    if (this.workers.has(queueName)) return;

    const worker = new Worker(
      queueName,
      async (bullJob: BullJob<JobPayload>) => {
        const payload = bullJob.data;
        const key = `${payload.queue}:${payload.type}`;
        const handler = this.handlers.get(key);

        if (!handler) {
          logger.warn("[queue:bullmq] No handler registered for job type", {
            key,
            jobId: payload.id,
          });
          throw new Error(`No handler registered for ${key}`);
        }

        await handler(payload);
      },
      {
        connection: this.connection.duplicate() as any,
        prefix: this.prefix,
        concurrency: this.concurrency,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    worker.on("completed", (job) => {
      logger.info("[queue:bullmq] Job completed", {
        jobId: job.id,
        queue: queueName,
      });
    });

    worker.on("failed", (job, err) => {
      logger.error("[queue:bullmq] Job failed", {
        jobId: job?.id,
        queue: queueName,
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });

    worker.on("error", (err) => {
      logger.error("[queue:bullmq] Worker error", {
        queue: queueName,
        error: err.message,
      });
    });

    this.workers.set(queueName, worker);
  }

  // ── Job Status ──────────────────────────────────────────────────────────

  async getJobStatus(jobId: string, queue: string): Promise<JobStatusInfo | undefined> {
    const q = this.queues.get(queue);
    if (!q) return undefined;

    const bullJob = await q.getJob(jobId);
    if (!bullJob) return undefined;

    const state = await bullJob.getState();

    const statusMap: Record<string, JobStatus> = {
      completed: "completed",
      failed: "failed",
      delayed: "delayed",
      active: "active",
      waiting: "waiting",
      "waiting-children": "waiting",
      prioritized: "pending",
      unknown: "pending",
    };

    return {
      id: bullJob.id ?? jobId,
      queue,
      status: statusMap[state] ?? "pending",
      attempts: bullJob.attemptsMade,
      maxRetries: bullJob.opts.attempts ?? 3,
      ...(bullJob.failedReason ? { failedReason: bullJob.failedReason } : {}),
      createdAt: new Date(bullJob.timestamp).toISOString(),
      ...(bullJob.processedOn ? { processedAt: new Date(bullJob.processedOn).toISOString() } : {}),
      ...(bullJob.finishedOn ? { completedAt: new Date(bullJob.finishedOn).toISOString() } : {}),
    };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async close(): Promise<void> {
    const closeTasks: Promise<void>[] = [];

    for (const [name, worker] of this.workers) {
      closeTasks.push(
        worker.close().then(() => {
          logger.info("[queue:bullmq] Worker closed", { queue: name });
        }),
      );
    }

    for (const [name, queue] of this.queues) {
      closeTasks.push(
        queue.close().then(() => {
          logger.info("[queue:bullmq] Queue closed", { queue: name });
        }),
      );
    }

    await Promise.allSettled(closeTasks);
    await this.connection.quit();

    this.workers.clear();
    this.queues.clear();
    this.handlers.clear();

    logger.info("[queue:bullmq] Provider closed");
  }
}

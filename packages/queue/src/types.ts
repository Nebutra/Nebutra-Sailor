import { z } from "zod";

// =============================================================================
// Core Queue Abstraction — Provider-agnostic message queue types
// =============================================================================

/**
 * Supported queue backend providers.
 *
 * - `qstash`  — Upstash QStash (serverless, HTTP-based, zero infra)
 * - `bullmq`  — BullMQ over self-hosted Redis (full-featured, self-managed)
 * - `memory`  — In-memory queue for local dev & testing (NOT for production)
 */
export type QueueProviderType = "qstash" | "bullmq" | "memory";

// ── Job Schema ──────────────────────────────────────────────────────────────

export const JobOptionsSchema = z.object({
  /** Unique idempotency key — prevents duplicate processing */
  idempotencyKey: z.string().optional(),

  /** Delay before the job becomes visible (in seconds) */
  delaySec: z.number().int().min(0).optional(),

  /** Maximum retry attempts on failure (default: 3) */
  maxRetries: z.number().int().min(0).optional(),

  /** Priority: lower number = higher priority (BullMQ only, ignored by QStash) */
  priority: z.number().int().min(0).optional(),

  /** Cron expression for recurring jobs (e.g. "0 3 * * *") */
  cron: z.string().optional(),

  /** Tenant isolation — jobs can be scoped to a tenant */
  tenantId: z.string().optional(),

  /** Arbitrary metadata passed through to the handler */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type JobOptions = z.infer<typeof JobOptionsSchema>;

export const JobPayloadSchema = z.object({
  /** Globally unique job ID (auto-generated if omitted) */
  id: z.string(),

  /** Queue / topic name this job belongs to */
  queue: z.string(),

  /** Fully-qualified handler name (e.g. "email.send", "report.generate") */
  type: z.string(),

  /** Serialisable job data */
  data: z.record(z.string(), z.unknown()),

  /** Job scheduling & retry options */
  options: JobOptionsSchema.optional(),

  /** ISO-8601 creation timestamp */
  createdAt: z.string().datetime(),
});

export type JobPayload = z.infer<typeof JobPayloadSchema>;

// ── Job Result ──────────────────────────────────────────────────────────────

export interface JobResult {
  /** Provider-specific job/message ID */
  jobId: string;

  /** Acknowledged by the provider? */
  accepted: boolean;

  /** Provider name that handled the enqueue */
  provider: QueueProviderType;
}

// ── Job Status (for observability) ──────────────────────────────────────────

export type JobStatus = "pending" | "active" | "completed" | "failed" | "delayed" | "waiting";

export interface JobStatusInfo {
  id: string;
  queue: string;
  status: JobStatus;
  attempts: number;
  maxRetries: number;
  failedReason?: string;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
}

// ── Handler ─────────────────────────────────────────────────────────────────

/**
 * A job handler receives the payload and returns void on success
 * or throws to trigger a retry.
 */
export type JobHandler<T extends Record<string, unknown> = Record<string, unknown>> = (
  job: JobPayload & { data: T },
) => Promise<void>;

// ── Provider Interface ──────────────────────────────────────────────────────

/**
 * Every queue backend must implement this interface.
 * The factory function (`createQueue`) returns a `QueueProvider`.
 */
export interface QueueProvider {
  readonly name: QueueProviderType;

  /**
   * Enqueue a job for async processing.
   */
  enqueue(job: JobPayload): Promise<JobResult>;

  /**
   * Enqueue multiple jobs in a single round-trip (where supported).
   * Falls back to sequential enqueue if the provider has no native batch API.
   */
  enqueueBatch(jobs: JobPayload[]): Promise<JobResult[]>;

  /**
   * Register a handler for a given job type.
   * - BullMQ: starts a Worker that polls Redis.
   * - QStash: returns an HTTP handler to mount in your API route.
   * - Memory: processes inline.
   */
  registerHandler<T extends Record<string, unknown>>(
    queue: string,
    type: string,
    handler: JobHandler<T>,
  ): void;

  /**
   * Query the status of a previously enqueued job (best-effort).
   * Not all providers support this; returns `undefined` if unsupported.
   */
  getJobStatus?(jobId: string, queue: string): Promise<JobStatusInfo | undefined>;

  /**
   * Graceful shutdown — drain in-flight jobs, close connections.
   */
  close(): Promise<void>;
}

// ── Factory Config ──────────────────────────────────────────────────────────

export interface QStashProviderConfig {
  provider: "qstash";

  /** QStash REST token (defaults to `process.env.QSTASH_TOKEN`) */
  token?: string;

  /**
   * Base URL of your API that QStash will POST callbacks to.
   * e.g. "https://api.nebutra.com" or "https://my-tunnel.ngrok.io"
   */
  callbackBaseUrl: string;

  /** Optional signing keys for webhook verification */
  currentSigningKey?: string;
  nextSigningKey?: string;
}

export interface BullMQProviderConfig {
  provider: "bullmq";

  /** Redis connection URL (defaults to `process.env.REDIS_URL`) */
  redisUrl?: string;

  /** Default concurrency per worker (default: 5) */
  concurrency?: number;

  /** Key prefix for Redis keys (default: "nebutra:queue") */
  prefix?: string;
}

export interface MemoryProviderConfig {
  provider: "memory";
}

export type QueueConfig = QStashProviderConfig | BullMQProviderConfig | MemoryProviderConfig;

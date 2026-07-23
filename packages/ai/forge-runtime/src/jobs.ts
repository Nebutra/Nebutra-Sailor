import { randomUUID } from "node:crypto";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ForgeJob {
  readonly id: string;
  readonly toolId: string;
  readonly status: JobStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly error?: string;
  readonly result?: unknown;
}

interface MutableJob {
  id: string;
  toolId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: unknown;
}

/**
 * Process-local job store for Forge async tools (md→pdf, heavy image).
 * Swap for Redis/queue in production.
 */
export class MemoryJobStore {
  private readonly jobs = new Map<string, MutableJob>();

  create(toolId: string): ForgeJob {
    const now = new Date().toISOString();
    const job: MutableJob = {
      id: randomUUID(),
      toolId,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return snapshot(job);
  }

  get(id: string): ForgeJob | null {
    const job = this.jobs.get(id);
    return job ? snapshot(job) : null;
  }

  markRunning(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "running";
    job.updatedAt = new Date().toISOString();
  }

  complete(id: string, result: unknown): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "succeeded";
    job.result = result;
    job.updatedAt = new Date().toISOString();
  }

  fail(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "failed";
    job.error = error;
    job.updatedAt = new Date().toISOString();
  }
}

function snapshot(job: MutableJob): ForgeJob {
  return {
    id: job.id,
    toolId: job.toolId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    ...(job.error !== undefined ? { error: job.error } : {}),
    ...(job.result !== undefined ? { result: job.result } : {}),
  };
}

let defaultStore: MemoryJobStore | undefined;

export function getDefaultJobStore(): MemoryJobStore {
  if (!defaultStore) defaultStore = new MemoryJobStore();
  return defaultStore;
}

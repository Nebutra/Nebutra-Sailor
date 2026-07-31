import { randomUUID } from "node:crypto";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

export interface CreateJobOptions {
  readonly batchId?: string;
  readonly label?: string;
  readonly index?: number;
  /** Default `queued`. Use `skipped` for pre-dispatch validation failures. */
  readonly status?: "queued" | "skipped";
  readonly error?: string;
}

export interface ForgeJob {
  readonly id: string;
  readonly toolId: string;
  readonly status: JobStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly error?: string;
  readonly result?: unknown;
  /** Present when this job is one item of a batch manifest. */
  readonly batchId?: string;
  readonly label?: string;
  readonly index?: number;
}

export interface ForgeJobStore {
  create(toolId: string, options?: CreateJobOptions): Promise<ForgeJob>;
  get(id: string): Promise<ForgeJob | null>;
  markRunning(id: string): Promise<void>;
  complete(id: string, result: unknown): Promise<void>;
  fail(id: string, error: string): Promise<void>;
}

interface MutableJob {
  id: string;
  toolId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: unknown;
  batchId?: string;
  label?: string;
  index?: number;
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
    ...(job.batchId !== undefined ? { batchId: job.batchId } : {}),
    ...(job.label !== undefined ? { label: job.label } : {}),
    ...(job.index !== undefined ? { index: job.index } : {}),
  };
}

function newJob(toolId: string, options?: CreateJobOptions): MutableJob {
  const now = new Date().toISOString();
  const status = options?.status ?? "queued";
  return {
    id: randomUUID(),
    toolId,
    status,
    createdAt: now,
    updatedAt: now,
    ...(options?.error !== undefined ? { error: options.error } : {}),
    ...(options?.batchId !== undefined ? { batchId: options.batchId } : {}),
    ...(options?.label !== undefined ? { label: options.label } : {}),
    ...(options?.index !== undefined ? { index: options.index } : {}),
  };
}

/**
 * Process-local job store for Forge async tools (md→pdf, heavy image).
 * Default when Redis/Upstash is not configured.
 */
export class MemoryJobStore implements ForgeJobStore {
  private readonly jobs = new Map<string, MutableJob>();

  async create(toolId: string, options?: CreateJobOptions): Promise<ForgeJob> {
    const job = newJob(toolId, options);
    this.jobs.set(job.id, job);
    return snapshot(job);
  }

  async get(id: string): Promise<ForgeJob | null> {
    const job = this.jobs.get(id);
    return job ? snapshot(job) : null;
  }

  async markRunning(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "running";
    job.updatedAt = new Date().toISOString();
  }

  async complete(id: string, result: unknown): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "succeeded";
    job.result = result;
    job.updatedAt = new Date().toISOString();
  }

  async fail(id: string, error: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "failed";
    job.error = error;
    job.updatedAt = new Date().toISOString();
  }
}

const JOB_TTL_SECONDS = 60 * 60 * 24; // 24h

/**
 * Upstash Redis REST job store — multi-instance safe for ECS/CF workers.
 * Enabled when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set
 * (or FORGE_JOB_STORE=upstash with the same vars).
 */
export class UpstashRedisJobStore implements ForgeJobStore {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly keyPrefix = "forge:job:",
  ) {}

  private key(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  private async rest(command: unknown[]): Promise<unknown> {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upstash job store HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as { result?: unknown };
    return body.result;
  }

  private async write(job: MutableJob): Promise<void> {
    await this.rest(["SET", this.key(job.id), JSON.stringify(job), "EX", String(JOB_TTL_SECONDS)]);
  }

  private async read(id: string): Promise<MutableJob | null> {
    const raw = await this.rest(["GET", this.key(id)]);
    if (typeof raw !== "string" || !raw) return null;
    try {
      return JSON.parse(raw) as MutableJob;
    } catch {
      return null;
    }
  }

  async create(toolId: string, options?: CreateJobOptions): Promise<ForgeJob> {
    const job = newJob(toolId, options);
    await this.write(job);
    return snapshot(job);
  }

  async get(id: string): Promise<ForgeJob | null> {
    const job = await this.read(id);
    return job ? snapshot(job) : null;
  }

  async markRunning(id: string): Promise<void> {
    const job = await this.read(id);
    if (!job) return;
    job.status = "running";
    job.updatedAt = new Date().toISOString();
    await this.write(job);
  }

  async complete(id: string, result: unknown): Promise<void> {
    const job = await this.read(id);
    if (!job) return;
    job.status = "succeeded";
    job.result = result;
    job.updatedAt = new Date().toISOString();
    await this.write(job);
  }

  async fail(id: string, error: string): Promise<void> {
    const job = await this.read(id);
    if (!job) return;
    job.status = "failed";
    job.error = error;
    job.updatedAt = new Date().toISOString();
    await this.write(job);
  }
}

let defaultStore: ForgeJobStore | undefined;

export function createJobStoreFromEnv(env: NodeJS.ProcessEnv = process.env): ForgeJobStore {
  const mode = (env.FORGE_JOB_STORE ?? "").toLowerCase();
  const url = env.UPSTASH_REDIS_REST_URL ?? env.FORGE_UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.FORGE_UPSTASH_REDIS_REST_TOKEN;
  if ((mode === "upstash" || mode === "redis" || (!mode && url && token)) && url && token) {
    return new UpstashRedisJobStore(url.replace(/\/$/, ""), token);
  }
  return new MemoryJobStore();
}

export function getDefaultJobStore(): ForgeJobStore {
  if (!defaultStore) defaultStore = createJobStoreFromEnv();
  return defaultStore;
}

/** Test helper — reset singleton between cases. */
export function resetDefaultJobStoreForTests(store?: ForgeJobStore): void {
  defaultStore = store;
}

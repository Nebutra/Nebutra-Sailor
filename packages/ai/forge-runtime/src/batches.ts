/**
 * Processor batch surface — N independent jobs under one manifest.
 * See docs/plans/tools/_processor-batch-surface.md and
 * docs/plans/2026-07-31-forge-f2-convergence.md Track A.
 */
import { randomUUID } from "node:crypto";
import type { ForgeJob, ForgeJobStore, JobStatus } from "./jobs";

export type BatchResultKind = "file" | "json";
export type BatchAccept = "files" | "lines";

/** Aggregate status — derived from item jobs, never stored. */
export type BatchStatus = "running" | "succeeded" | "partial" | "failed";

export interface ToolBatchMeta {
  readonly resultKind: BatchResultKind;
  readonly accept: BatchAccept;
  /** Override global FORGE_BATCH_MAX_ITEMS when set. */
  readonly maxItems?: number;
}

export interface ForgeBatchManifest {
  readonly id: string;
  readonly toolId: string;
  readonly resultKind: BatchResultKind;
  /** Ordered job ids — index = display order. */
  readonly itemIds: readonly string[];
  readonly createdAt: string;
}

export interface BatchItemInput {
  readonly label?: string;
  readonly input: unknown;
}

export interface BatchCounts {
  readonly total: number;
  readonly queued: number;
  readonly running: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface BatchItemView {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly status: JobStatus;
  readonly error?: string;
}

export interface BatchAggregate {
  readonly id: string;
  readonly toolId: string;
  readonly status: BatchStatus;
  readonly resultKind: BatchResultKind;
  readonly counts: BatchCounts;
  readonly items: readonly BatchItemView[];
  readonly createdAt: string;
}

export interface ForgeBatchStore {
  put(manifest: ForgeBatchManifest): Promise<void>;
  get(id: string): Promise<ForgeBatchManifest | null>;
  /** Replace itemIds[index] with newJobId (retry). */
  replaceItemId(batchId: string, index: number, newJobId: string): Promise<void>;
}

const BATCH_TTL_SECONDS = 60 * 60 * 24; // 24h — co-expire with jobs
const DEFAULT_MAX_ITEMS = 50;

/**
 * Derive batch-level status from item statuses.
 *
 * - all skipped → failed
 * - any queued|running → running
 * - all terminal, mix of success + fail/skip → partial
 * - all succeeded → succeeded
 * - all failed/skipped → failed
 */
export function deriveBatchStatus(statuses: readonly JobStatus[]): BatchStatus {
  if (statuses.length === 0) return "failed";
  if (statuses.every((s) => s === "skipped")) return "failed";
  if (statuses.some((s) => s === "queued" || s === "running")) return "running";
  const anyOk = statuses.some((s) => s === "succeeded");
  const anyBad = statuses.some((s) => s === "failed" || s === "skipped");
  if (anyOk && anyBad) return "partial";
  if (anyOk) return "succeeded";
  return "failed";
}

export function countBatchStatuses(statuses: readonly JobStatus[]): BatchCounts {
  let queued = 0;
  let running = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const s of statuses) {
    if (s === "queued") queued++;
    else if (s === "running") running++;
    else if (s === "succeeded") succeeded++;
    else if (s === "failed") failed++;
    else if (s === "skipped") skipped++;
  }
  return {
    total: statuses.length,
    queued,
    running,
    succeeded,
    failed,
    skipped,
  };
}

export function resolveBatchMaxItems(
  toolMax: number | undefined,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const fromEnv = Number(env.FORGE_BATCH_MAX_ITEMS ?? DEFAULT_MAX_ITEMS);
  const globalCap =
    Number.isFinite(fromEnv) && fromEnv > 0 ? Math.floor(fromEnv) : DEFAULT_MAX_ITEMS;
  if (toolMax !== undefined && Number.isFinite(toolMax) && toolMax > 0) {
    return Math.min(Math.floor(toolMax), globalCap);
  }
  return globalCap;
}

export function buildBatchAggregate(
  manifest: ForgeBatchManifest,
  jobs: readonly (ForgeJob | null)[],
): BatchAggregate {
  const items: BatchItemView[] = manifest.itemIds.map((id, index) => {
    const job = jobs[index];
    if (!job) {
      return {
        id,
        index,
        label: `#${index + 1}`,
        status: "failed" as const,
        error: "job_not_found",
      };
    }
    return {
      id: job.id,
      index,
      label: job.label ?? `#${index + 1}`,
      status: job.status,
      ...(job.error !== undefined ? { error: job.error } : {}),
    };
  });
  const statuses = items.map((i) => i.status);
  return {
    id: manifest.id,
    toolId: manifest.toolId,
    status: deriveBatchStatus(statuses),
    resultKind: manifest.resultKind,
    counts: countBatchStatuses(statuses),
    items,
    createdAt: manifest.createdAt,
  };
}

export class MemoryBatchStore implements ForgeBatchStore {
  private readonly batches = new Map<string, ForgeBatchManifest>();

  async put(manifest: ForgeBatchManifest): Promise<void> {
    this.batches.set(manifest.id, {
      ...manifest,
      itemIds: [...manifest.itemIds],
    });
  }

  async get(id: string): Promise<ForgeBatchManifest | null> {
    const m = this.batches.get(id);
    return m ? { ...m, itemIds: [...m.itemIds] } : null;
  }

  async replaceItemId(batchId: string, index: number, newJobId: string): Promise<void> {
    const m = this.batches.get(batchId);
    if (!m) return;
    if (index < 0 || index >= m.itemIds.length) return;
    const itemIds = [...m.itemIds];
    itemIds[index] = newJobId;
    this.batches.set(batchId, { ...m, itemIds });
  }
}

export class UpstashRedisBatchStore implements ForgeBatchStore {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly keyPrefix = "forge:batch:",
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
      throw new Error(`Upstash batch store HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as { result?: unknown };
    return body.result;
  }

  async put(manifest: ForgeBatchManifest): Promise<void> {
    await this.rest([
      "SET",
      this.key(manifest.id),
      JSON.stringify(manifest),
      "EX",
      String(BATCH_TTL_SECONDS),
    ]);
  }

  async get(id: string): Promise<ForgeBatchManifest | null> {
    const raw = await this.rest(["GET", this.key(id)]);
    if (typeof raw !== "string" || !raw) return null;
    try {
      return JSON.parse(raw) as ForgeBatchManifest;
    } catch {
      return null;
    }
  }

  async replaceItemId(batchId: string, index: number, newJobId: string): Promise<void> {
    const m = await this.get(batchId);
    if (!m) return;
    if (index < 0 || index >= m.itemIds.length) return;
    const itemIds = [...m.itemIds];
    itemIds[index] = newJobId;
    await this.put({ ...m, itemIds });
  }
}

let defaultBatchStore: ForgeBatchStore | undefined;

export function createBatchStoreFromEnv(env: NodeJS.ProcessEnv = process.env): ForgeBatchStore {
  const mode = (env.FORGE_JOB_STORE ?? "").toLowerCase();
  const url = env.UPSTASH_REDIS_REST_URL ?? env.FORGE_UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.FORGE_UPSTASH_REDIS_REST_TOKEN;
  if ((mode === "upstash" || mode === "redis" || (!mode && url && token)) && url && token) {
    return new UpstashRedisBatchStore(url.replace(/\/$/, ""), token);
  }
  return new MemoryBatchStore();
}

export function getDefaultBatchStore(): ForgeBatchStore {
  if (!defaultBatchStore) defaultBatchStore = createBatchStoreFromEnv();
  return defaultBatchStore;
}

/** Test helper — reset singleton between cases. */
export function resetDefaultBatchStoreForTests(store?: ForgeBatchStore): void {
  defaultBatchStore = store;
}

export interface CreateBatchParams {
  readonly toolId: string;
  readonly resultKind: BatchResultKind;
  readonly items: readonly BatchItemInput[];
  readonly maxItems: number;
  /** When true, empty/missing input becomes skipped rather than rejected. */
  readonly skipInvalid?: boolean;
}

export type CreateBatchResult =
  | {
      readonly ok: true;
      readonly manifest: ForgeBatchManifest;
      readonly jobs: readonly ForgeJob[];
    }
  | {
      readonly ok: false;
      readonly code: "batch_too_large" | "batch_empty" | "batch_all_invalid";
      readonly message: string;
    };

/**
 * Create a batch manifest + N jobs. Does **not** dispatch — caller marks
 * running and dispatches independently so isolation stays per-item.
 */
export async function createBatchJobs(
  jobStore: ForgeJobStore,
  batchStore: ForgeBatchStore,
  params: CreateBatchParams,
): Promise<CreateBatchResult> {
  const { toolId, resultKind, items, maxItems, skipInvalid = true } = params;
  if (items.length === 0) {
    return { ok: false, code: "batch_empty", message: "items must be non-empty" };
  }
  if (items.length > maxItems) {
    return {
      ok: false,
      code: "batch_too_large",
      message: `items.length ${items.length} exceeds max ${maxItems}`,
    };
  }

  const batchId = randomUUID();
  const createdAt = new Date().toISOString();
  const jobs: ForgeJob[] = [];
  const itemIds: string[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    const label = item.label?.trim() || `#${index + 1}`;
    const invalid =
      item.input === undefined ||
      item.input === null ||
      (typeof item.input === "string" && item.input.trim() === "") ||
      (typeof item.input === "object" &&
        !Array.isArray(item.input) &&
        Object.keys(item.input as object).length === 0);

    if (invalid && skipInvalid) {
      const job = await jobStore.create(toolId, {
        batchId,
        label,
        index,
        status: "skipped",
        error: "empty_or_invalid_item",
      });
      jobs.push(job);
      itemIds.push(job.id);
      continue;
    }

    if (invalid) {
      return {
        ok: false,
        code: "batch_all_invalid",
        message: `item ${index} has empty input`,
      };
    }

    const job = await jobStore.create(toolId, {
      batchId,
      label,
      index,
      status: "queued",
    });
    jobs.push(job);
    itemIds.push(job.id);
  }

  if (jobs.every((j) => j.status === "skipped")) {
    return {
      ok: false,
      code: "batch_all_invalid",
      message: "every item was empty or invalid",
    };
  }

  const manifest: ForgeBatchManifest = {
    id: batchId,
    toolId,
    resultKind,
    itemIds,
    createdAt,
  };
  await batchStore.put(manifest);
  return { ok: true, manifest, jobs };
}

/**
 * Retry a single failed/skipped item: new job id, same index/label/batchId.
 */
export async function retryBatchItem(
  jobStore: ForgeJobStore,
  batchStore: ForgeBatchStore,
  batchId: string,
  itemId: string,
): Promise<
  | { ok: true; job: ForgeJob; index: number; inputPlaceholder: true }
  | {
      ok: false;
      code: "batch_not_found" | "item_not_found" | "item_not_retryable";
      message: string;
    }
> {
  const manifest = await batchStore.get(batchId);
  if (!manifest) {
    return { ok: false, code: "batch_not_found", message: `Unknown batch: ${batchId}` };
  }
  const index = manifest.itemIds.indexOf(itemId);
  if (index < 0) {
    return { ok: false, code: "item_not_found", message: `Item ${itemId} not in batch` };
  }
  const old = await jobStore.get(itemId);
  if (!old) {
    return { ok: false, code: "item_not_found", message: `Job ${itemId} not found` };
  }
  if (old.status === "queued" || old.status === "running") {
    return {
      ok: false,
      code: "item_not_retryable",
      message: `Item is still ${old.status}`,
    };
  }
  // Succeeded items can be force-retried if caller wants — allowed for flexibility.
  const job = await jobStore.create(manifest.toolId, {
    batchId,
    label: old.label ?? `#${index + 1}`,
    index,
    status: "queued",
  });
  await batchStore.replaceItemId(batchId, index, job.id);
  return { ok: true, job, index, inputPlaceholder: true };
}

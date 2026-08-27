import { describe, expect, it } from "vitest";
import {
  buildBatchAggregate,
  createBatchJobs,
  deriveBatchStatus,
  MemoryBatchStore,
  resolveBatchMaxItems,
  retryBatchItem,
} from "./batches";
import { MemoryJobStore } from "./jobs";

describe("deriveBatchStatus", () => {
  it("returns failed for empty or all-skipped", () => {
    expect(deriveBatchStatus([])).toBe("failed");
    expect(deriveBatchStatus(["skipped", "skipped"])).toBe("failed");
  });

  it("returns running when any item is in flight", () => {
    expect(deriveBatchStatus(["succeeded", "queued"])).toBe("running");
    expect(deriveBatchStatus(["running", "failed"])).toBe("running");
  });

  it("returns partial when mix of success and failure", () => {
    expect(deriveBatchStatus(["succeeded", "failed"])).toBe("partial");
    expect(deriveBatchStatus(["succeeded", "skipped"])).toBe("partial");
  });

  it("returns succeeded only when all succeeded", () => {
    expect(deriveBatchStatus(["succeeded", "succeeded"])).toBe("succeeded");
  });

  it("returns failed when all terminal bad", () => {
    expect(deriveBatchStatus(["failed", "failed"])).toBe("failed");
    expect(deriveBatchStatus(["failed", "skipped"])).toBe("failed");
  });
});

describe("resolveBatchMaxItems", () => {
  it("defaults to 50", () => {
    expect(resolveBatchMaxItems(undefined, {})).toBe(50);
  });

  it("honors env and tool max (tool cannot exceed global)", () => {
    expect(resolveBatchMaxItems(200, { FORGE_BATCH_MAX_ITEMS: "50" })).toBe(50);
    expect(resolveBatchMaxItems(20, { FORGE_BATCH_MAX_ITEMS: "50" })).toBe(20);
    expect(resolveBatchMaxItems(undefined, { FORGE_BATCH_MAX_ITEMS: "30" })).toBe(30);
  });
});

describe("createBatchJobs + aggregate + retry", () => {
  it("rejects oversize before writing jobs", async () => {
    const jobs = new MemoryJobStore();
    const batches = new MemoryBatchStore();
    const r = await createBatchJobs(jobs, batches, {
      toolId: "text/isbn",
      resultKind: "json",
      maxItems: 2,
      items: [{ input: { a: 1 } }, { input: { b: 2 } }, { input: { c: 3 } }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("batch_too_large");
  });

  it("creates manifest with batch metadata on jobs", async () => {
    const jobs = new MemoryJobStore();
    const batches = new MemoryBatchStore();
    const r = await createBatchJobs(jobs, batches, {
      toolId: "text/isbn",
      resultKind: "json",
      maxItems: 50,
      items: [
        { label: "a", input: { code: "978" } },
        { label: "b", input: { code: "979" } },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifest.itemIds).toHaveLength(2);
    expect(r.jobs[0]?.batchId).toBe(r.manifest.id);
    expect(r.jobs[0]?.label).toBe("a");
    expect(r.jobs[0]?.index).toBe(0);
    expect(r.jobs[0]?.status).toBe("queued");

    const stored = await batches.get(r.manifest.id);
    expect(stored?.toolId).toBe("text/isbn");
  });

  it("skips empty items and fails batch_all_invalid when all empty", async () => {
    const jobs = new MemoryJobStore();
    const batches = new MemoryBatchStore();
    const mixed = await createBatchJobs(jobs, batches, {
      toolId: "text/isbn",
      resultKind: "json",
      maxItems: 50,
      items: [
        { label: "ok", input: { code: "1" } },
        { label: "empty", input: "" },
      ],
    });
    expect(mixed.ok).toBe(true);
    if (mixed.ok) {
      expect(mixed.jobs.some((j) => j.status === "skipped")).toBe(true);
      expect(mixed.jobs.some((j) => j.status === "queued")).toBe(true);
    }

    const allBad = await createBatchJobs(jobs, batches, {
      toolId: "text/isbn",
      resultKind: "json",
      maxItems: 50,
      items: [{ input: "" }, { input: {} }],
    });
    expect(allBad.ok).toBe(false);
    if (!allBad.ok) expect(allBad.code).toBe("batch_all_invalid");
  });

  it("derives partial aggregate after one fail", async () => {
    const jobs = new MemoryJobStore();
    const batches = new MemoryBatchStore();
    const r = await createBatchJobs(jobs, batches, {
      toolId: "text/isbn",
      resultKind: "json",
      maxItems: 50,
      items: [
        { label: "a", input: { code: "1" } },
        { label: "b", input: { code: "2" } },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await jobs.complete(r.jobs[0]!.id, { ok: true });
    await jobs.fail(r.jobs[1]!.id, "boom");
    const loaded = await Promise.all(r.manifest.itemIds.map((id) => jobs.get(id)));
    const agg = buildBatchAggregate(r.manifest, loaded);
    expect(agg.status).toBe("partial");
    expect(agg.counts.succeeded).toBe(1);
    expect(agg.counts.failed).toBe(1);
    // Aggregate never inlines item results
    expect(JSON.stringify(agg)).not.toContain('"ok":true');
  });

  it("retries a failed item with a new job id", async () => {
    const jobs = new MemoryJobStore();
    const batches = new MemoryBatchStore();
    const r = await createBatchJobs(jobs, batches, {
      toolId: "text/isbn",
      resultKind: "json",
      maxItems: 50,
      items: [
        { label: "a", input: { code: "1" } },
        { label: "b", input: { code: "2" } },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const failedId = r.jobs[1]!.id;
    await jobs.fail(failedId, "x");
    const retry = await retryBatchItem(jobs, batches, r.manifest.id, failedId);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.job.id).not.toBe(failedId);
    expect(retry.job.label).toBe("b");
    expect(retry.index).toBe(1);
    const m = await batches.get(r.manifest.id);
    expect(m?.itemIds[1]).toBe(retry.job.id);
    expect(m?.itemIds[0]).toBe(r.jobs[0]!.id);
  });
});

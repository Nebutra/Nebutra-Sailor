/**
 * Behavioural tests for the incremental code-index engine.
 *
 * All ports are hand-written in-memory fakes (no mocking libraries). The fakes
 * record their interactions so we can assert the exact incremental contract:
 *
 *  - full scan when metadata is absent
 *  - incremental skip-by-hash for unchanged files
 *  - changed file → delete-then-upsert
 *  - deleted file → prune from store + cache
 *  - embedding-profile drift → recreate + clear cache + full scan
 *  - batch segmentation at BATCH_SEGMENT_THRESHOLD
 *  - exponential backoff retry that eventually succeeds (deterministic sleep)
 *  - >10% full-scan batch-failure gate → hard throw, indexingComplete stays false
 *  - search fail-closed (missing / incomplete / drifted) → throws
 *  - search happy path delegates to store unchanged
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  BATCH_SEGMENT_THRESHOLD,
  createIndexEngine,
  DEFAULT_MAX_RESULTS,
  DEFAULT_MIN_SCORE,
  FULL_SCAN_FAILURE_GATE,
  MAX_BACKOFF_ATTEMPTS,
  MAX_FILE_SIZE,
} from "./index-engine";
import {
  type CodeBlock,
  CodeIndexNotConfiguredError,
  type CollectionKey,
  collectionKey,
  deriveId,
  type Embedder,
  type FileSource,
  type FileStat,
  fileHash,
  type IndexCacheStore,
  type IndexMetadata,
  type SearchHit,
  segmentHash,
  type VectorPoint,
  type VectorStore,
} from "./interfaces";

const KEY = collectionKey({ tenantId: "tenant_a", project: "repo_x" });

// ─── In-memory FileSource fake ──────────────────────────────────────────────

class FakeFiles implements FileSource {
  files = new Map<string, string>();
  sizes = new Map<string, number>();

  set(path: string, content: string, size?: number): void {
    this.files.set(path, content);
    this.sizes.set(path, size ?? Buffer.byteLength(content, "utf8"));
  }

  remove(path: string): void {
    this.files.delete(path);
    this.sizes.delete(path);
  }

  async list(): Promise<FileStat[]> {
    return [...this.files.keys()].map((path) => ({
      path,
      size: this.sizes.get(path) ?? 0,
      token: fileHash(this.files.get(path) ?? ""),
    }));
  }

  async read(path: string): Promise<string> {
    const c = this.files.get(path);
    if (c === undefined) throw new Error(`no such file: ${path}`);
    return c;
  }
}

// ─── In-memory VectorStore fake ─────────────────────────────────────────────

interface StoredPoint extends VectorPoint {}

class FakeStore implements VectorStore {
  points = new Map<string, StoredPoint>();
  meta: IndexMetadata | undefined;

  recreateCalls = 0;
  ensureCalls = 0;
  upsertCalls: VectorPoint[][] = [];
  deleteByFilePathCalls: string[] = [];
  deleteByIdsCalls: string[][] = [];

  async ensureCollection(_k: CollectionKey, _d: number): Promise<void> {
    this.ensureCalls += 1;
  }

  async recreate(_k: CollectionKey, _d: number): Promise<void> {
    this.recreateCalls += 1;
    this.points.clear();
    this.meta = undefined;
  }

  async upsert(_k: CollectionKey, points: VectorPoint[]): Promise<void> {
    this.upsertCalls.push(points.map((p) => ({ ...p })));
    for (const p of points) this.points.set(p.id, { ...p });
  }

  async deleteByFilePath(_k: CollectionKey, filePath: string): Promise<void> {
    this.deleteByFilePathCalls.push(filePath);
    for (const [id, p] of this.points) {
      if (p.filePath === filePath) this.points.delete(id);
    }
  }

  async deleteByIds(_k: CollectionKey, ids: string[]): Promise<void> {
    this.deleteByIdsCalls.push([...ids]);
    for (const id of ids) this.points.delete(id);
  }

  async search(
    _k: CollectionKey,
    _vec: number[],
    options: { minScore: number; maxResults: number; pathPrefix?: string },
  ): Promise<SearchHit[]> {
    const hits: SearchHit[] = [...this.points.values()]
      .filter((p) => (options.pathPrefix ? p.filePath.startsWith(options.pathPrefix) : true))
      .map((p) => ({
        id: p.id,
        filePath: p.filePath,
        content: p.content,
        startLine: p.startLine,
        endLine: p.endLine,
        score: 0.9,
      }))
      .filter((h) => h.score >= options.minScore)
      .slice(0, options.maxResults);
    return hits;
  }

  async getMetadata(_k: CollectionKey): Promise<IndexMetadata | undefined> {
    return this.meta;
  }

  async setMetadata(_k: CollectionKey, meta: IndexMetadata): Promise<void> {
    this.meta = { ...meta };
  }
}

// ─── In-memory cache fake ───────────────────────────────────────────────────

class FakeCache implements IndexCacheStore {
  store = new Map<string, Record<string, string>>();
  saveCalls = 0;

  preset(key: CollectionKey, map: Record<string, string>): void {
    this.store.set(key, { ...map });
  }

  async load(key: CollectionKey): Promise<Record<string, string>> {
    return { ...(this.store.get(key) ?? {}) };
  }

  async save(key: CollectionKey, map: Record<string, string>): Promise<void> {
    this.saveCalls += 1;
    this.store.set(key, { ...map });
  }
}

// ─── Embedder fakes ─────────────────────────────────────────────────────────

class FakeEmbedder implements Embedder {
  embedCalls: string[][] = [];

  constructor(
    public provider = "prov-1",
    public modelId = "model-1",
    public dimension = 3,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    this.embedCalls.push([...texts]);
    return texts.map((_, i) => Array(this.dimension).fill(0.1 * (i + 1)));
  }
}

/** Embedder whose first N embed() calls reject, then succeeds. */
class FlakyEmbedder extends FakeEmbedder {
  attempts = 0;
  constructor(public failTimes: number) {
    super();
  }
  override async embed(texts: string[]): Promise<number[][]> {
    this.attempts += 1;
    if (this.attempts <= this.failTimes) {
      throw new Error(`transient embed failure #${this.attempts}`);
    }
    return super.embed(texts);
  }
}

// ─── Chunk fn fake ──────────────────────────────────────────────────────────

/** One block per file by default; deterministic content-addressed identity. */
function oneBlockChunk(a: { content: string; filePath: string; language: string }): CodeBlock[] {
  const startLine = 1;
  const endLine = a.content.split("\n").length;
  return [
    {
      filePath: a.filePath,
      identifier: "blk",
      type: `${a.language}_segment`,
      startLine,
      endLine,
      content: a.content,
      segmentHash: segmentHash({
        filePath: a.filePath,
        startLine,
        endLine,
        content: a.content,
      }),
      fileHash: fileHash(a.content),
    },
  ];
}

/** Produce `n` blocks for a file (to exercise batch segmentation). */
function nBlocksChunk(n: number) {
  return (a: { content: string; filePath: string; language: string }): CodeBlock[] => {
    return Array.from({ length: n }, (_, i) => {
      const content = `${a.content}::seg${i}`;
      return {
        filePath: a.filePath,
        identifier: `blk${i}`,
        type: `${a.language}_segment`,
        startLine: i + 1,
        endLine: i + 1,
        content,
        segmentHash: segmentHash({
          filePath: a.filePath,
          startLine: i + 1,
          endLine: i + 1,
          content,
        }),
        fileHash: fileHash(a.content),
      };
    });
  };
}

const noopSleep = async (_ms: number): Promise<void> => {};

interface Harness {
  files: FakeFiles;
  store: FakeStore;
  cache: FakeCache;
  embedder: FakeEmbedder;
}

function harness(over: Partial<Harness> = {}): Harness {
  return {
    files: over.files ?? new FakeFiles(),
    store: over.store ?? new FakeStore(),
    cache: over.cache ?? new FakeCache(),
    embedder: over.embedder ?? new FakeEmbedder(),
  };
}

describe("createIndexEngine — exported constants", () => {
  it("exposes the documented tuning constants", () => {
    expect(MAX_FILE_SIZE).toBe(1_048_576);
    expect(BATCH_SEGMENT_THRESHOLD).toBe(60);
    expect(DEFAULT_MIN_SCORE).toBe(0.4);
    expect(DEFAULT_MAX_RESULTS).toBe(50);
    expect(MAX_BACKOFF_ATTEMPTS).toBe(5);
    expect(FULL_SCAN_FAILURE_GATE).toBe(0.1);
  });
});

describe("indexAll — full scan when metadata absent", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it("recreates the collection and embeds every file", async () => {
    h.files.set("a.ts", "alpha");
    h.files.set("b.ts", "beta");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.store.recreateCalls).toBe(1);
    expect(h.store.points.size).toBe(2);
    expect(h.store.meta?.indexingComplete).toBe(true);
    expect(h.store.meta?.embeddingProvider).toBe("prov-1");
    expect(h.store.meta?.embeddingModelId).toBe("model-1");
    expect(h.store.meta?.embeddingDimension).toBe(3);
  });

  it("sets indexingComplete=false BEFORE work, true only on success", async () => {
    h.files.set("a.ts", "alpha");
    const seen: boolean[] = [];
    const origUpsert = h.store.upsert.bind(h.store);
    h.store.upsert = async (k, pts) => {
      seen.push(h.store.meta?.indexingComplete ?? false);
      return origUpsert(k, pts);
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(seen).toEqual([false]);
    expect(h.store.meta?.indexingComplete).toBe(true);
  });

  it("clears the cache on a full scan and records new file hashes", async () => {
    h.cache.preset(KEY, { "stale.ts": "deadbeef" });
    h.files.set("a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    const finalCache = await h.cache.load(KEY);
    expect(finalCache["stale.ts"]).toBeUndefined();
    expect(finalCache["a.ts"]).toBe(fileHash("alpha"));
  });

  it("uses a deterministic deriveId(segmentHash) for point ids", async () => {
    h.files.set("a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    const expectedId = deriveId(
      segmentHash({
        filePath: "a.ts",
        startLine: 1,
        endLine: 1,
        content: "alpha",
      }),
    );
    expect(h.store.points.has(expectedId)).toBe(true);
  });
});

describe("indexAll — incremental scan", () => {
  it("skips unchanged files by file hash", async () => {
    const h = harness();
    h.files.set("a.ts", "alpha");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    h.cache.preset(KEY, { "a.ts": fileHash("alpha") });
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.store.recreateCalls).toBe(0);
    expect(h.embedder.embedCalls.length).toBe(0);
    expect(h.store.upsertCalls.length).toBe(0);
    expect(h.store.meta?.indexingComplete).toBe(true);
  });

  it("re-embeds a changed file via delete-then-upsert", async () => {
    const h = harness();
    h.files.set("a.ts", "alpha-v1");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    h.cache.preset(KEY, { "a.ts": fileHash("old-content") });
    const order: string[] = [];
    const od = h.store.deleteByFilePath.bind(h.store);
    const ou = h.store.upsert.bind(h.store);
    h.store.deleteByFilePath = async (k, p) => {
      order.push(`delete:${p}`);
      return od(k, p);
    };
    h.store.upsert = async (k, pts) => {
      order.push(`upsert:${pts.length}`);
      return ou(k, pts);
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(order).toEqual(["delete:a.ts", "upsert:1"]);
    expect((await h.cache.load(KEY))["a.ts"]).toBe(fileHash("alpha-v1"));
  });

  it("prunes files that vanished from the listing", async () => {
    const h = harness();
    h.files.set("keep.ts", "keep");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    h.cache.preset(KEY, {
      "keep.ts": fileHash("keep"),
      "gone.ts": fileHash("gone"),
    });
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.store.deleteByFilePathCalls).toContain("gone.ts");
    expect((await h.cache.load(KEY))["gone.ts"]).toBeUndefined();
    expect((await h.cache.load(KEY))["keep.ts"]).toBe(fileHash("keep"));
  });

  it("skips files larger than maxFileSize", async () => {
    const h = harness();
    h.files.set("big.ts", "x", 5_000_000);
    h.files.set("ok.ts", "ok", 10);
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    const c = await h.cache.load(KEY);
    expect(c["big.ts"]).toBeUndefined();
    expect(c["ok.ts"]).toBe(fileHash("ok"));
  });

  it("honours a custom maxFileSize override", async () => {
    const h = harness();
    h.files.set("medium.ts", "content", 500);
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      maxFileSize: 100,
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect((await h.cache.load(KEY))["medium.ts"]).toBeUndefined();
  });
});

describe("indexAll — embedding-profile drift", () => {
  it("recreates + clears cache + full scan when provider changes", async () => {
    const h = harness({ embedder: new FakeEmbedder("prov-2") });
    h.files.set("a.ts", "alpha");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    h.cache.preset(KEY, { "a.ts": fileHash("alpha") });
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.store.recreateCalls).toBe(1);
    // cache was cleared so the previously-cached "a.ts" got re-embedded
    expect(h.embedder.embedCalls.length).toBe(1);
    expect(h.store.meta?.embeddingProvider).toBe("prov-2");
  });

  it("recreates when the embedding dimension changes", async () => {
    const h = harness({ embedder: new FakeEmbedder("prov-1", "model-1", 8) });
    h.files.set("a.ts", "alpha");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.store.recreateCalls).toBe(1);
    expect(h.store.meta?.embeddingDimension).toBe(8);
  });

  it("recreates when the model id changes", async () => {
    const h = harness({
      embedder: new FakeEmbedder("prov-1", "model-2", 3),
    });
    h.files.set("a.ts", "alpha");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.store.recreateCalls).toBe(1);
    expect(h.store.meta?.embeddingModelId).toBe("model-2");
  });
});

describe("indexAll — batch segmentation", () => {
  it("flushes a batch once accumulated blocks reach the threshold", async () => {
    const h = harness();
    // 1 file producing exactly BATCH_SEGMENT_THRESHOLD blocks → 1 full batch,
    // then a trailing flush of whatever remains (0 here, so exactly 1 embed).
    h.files.set("a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: nBlocksChunk(BATCH_SEGMENT_THRESHOLD),
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.embedder.embedCalls.length).toBe(1);
    expect(h.embedder.embedCalls[0]?.length).toBe(BATCH_SEGMENT_THRESHOLD);
    expect(h.store.points.size).toBe(BATCH_SEGMENT_THRESHOLD);
  });

  it("splits into multiple embed batches when blocks exceed the threshold", async () => {
    const h = harness();
    h.files.set("a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: nBlocksChunk(BATCH_SEGMENT_THRESHOLD + 5),
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(h.embedder.embedCalls.length).toBe(2);
    expect(h.embedder.embedCalls[0]?.length).toBe(BATCH_SEGMENT_THRESHOLD);
    expect(h.embedder.embedCalls[1]?.length).toBe(5);
    expect(h.store.points.size).toBe(BATCH_SEGMENT_THRESHOLD + 5);
  });
});

describe("indexAll — backoff retry", () => {
  it("retries embed with pure-math backoff and eventually succeeds", async () => {
    const h = harness({ embedder: new FlakyEmbedder(2) });
    h.files.set("a.ts", "alpha");
    const sleeps: number[] = [];
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await engine.indexAll();

    // 2 failures then success → 2 backoff sleeps, strictly increasing (2^n).
    expect(sleeps.length).toBe(2);
    expect(sleeps[1]).toBeGreaterThan(sleeps[0] ?? 0);
    expect(h.store.points.size).toBe(1);
    expect(h.store.meta?.indexingComplete).toBe(true);
  });

  it("gives up after MAX_BACKOFF_ATTEMPTS and counts the batch as failed", async () => {
    // Single file, incremental scan (not full) so the failure-gate does not
    // apply: the engine should still complete without throwing, but the file
    // is NOT cached (so a later run retries it).
    const flaky = new FlakyEmbedder(999);
    const h = harness({ embedder: flaky });
    h.files.set("a.ts", "alpha");
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: flaky,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    expect(flaky.attempts).toBe(MAX_BACKOFF_ATTEMPTS);
    expect((await h.cache.load(KEY))["a.ts"]).toBeUndefined();
  });
});

describe("indexAll — full-scan failure gate", () => {
  it("throws when >10% of full-scan batches fail (indexingComplete stays false)", async () => {
    // 20 files, all fail → 100% failure rate > 10% gate → hard throw.
    const h = harness({ embedder: new FlakyEmbedder(999) });
    for (let i = 0; i < 20; i += 1) h.files.set(`f${i}.ts`, `c${i}`);
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await expect(engine.indexAll()).rejects.toThrow();
    expect(h.store.meta?.indexingComplete).toBe(false);
  });

  it("does NOT throw when full-scan failures stay at/under the 10% gate", async () => {
    // 20 files, each chunked into a full threshold-sized batch → 20 batches.
    // Exactly one batch (the one carrying f0's content) permanently fails →
    // 1/20 = 5% ≤ 10% gate → run completes, indexingComplete=true.
    const h = harness();
    for (let i = 0; i < 20; i += 1) h.files.set(`f${i}.ts`, `c${i}`);
    const orig = h.embedder.embed.bind(h.embedder);
    // f0's blocks all carry the "c0::seg*" content prefix; every retry of that
    // single batch rejects, all other batches succeed.
    h.embedder.embed = async (texts) => {
      if (texts.some((t) => t.startsWith("c0::"))) {
        throw new Error("permanent for f0 batch");
      }
      return orig(texts);
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      // One batch per file: each file yields exactly BATCH_SEGMENT_THRESHOLD
      // blocks, so file boundaries == batch boundaries.
      chunk: nBlocksChunk(BATCH_SEGMENT_THRESHOLD),
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await expect(engine.indexAll()).resolves.toBeUndefined();
    expect(h.store.meta?.indexingComplete).toBe(true);
  });
});

describe("indexAll — invalid point id guard", () => {
  it("never passes an id failing POINT_ID_RE to deleteByIds", async () => {
    const h = harness();
    h.files.set("a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });

    await engine.indexAll();

    for (const ids of h.store.deleteByIdsCalls) {
      for (const id of ids) {
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      }
    }
  });
});

describe("search — fail closed", () => {
  function configured(): {
    engine: ReturnType<typeof createIndexEngine>;
    h: Harness;
  } {
    const h = harness();
    h.files.set("a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });
    return { engine, h };
  }

  it("throws CodeIndexNotConfiguredError when metadata is missing", async () => {
    const { engine } = configured();
    await expect(engine.search("anything")).rejects.toBeInstanceOf(CodeIndexNotConfiguredError);
  });

  it("throws when indexingComplete !== true", async () => {
    const { engine, h } = configured();
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "prov-1",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: false,
    };
    await expect(engine.search("anything")).rejects.toBeInstanceOf(CodeIndexNotConfiguredError);
  });

  it("throws when the persisted embedding profile drifted from the embedder", async () => {
    const { engine, h } = configured();
    h.store.meta = {
      vectorSize: 3,
      embeddingProvider: "some-other-provider",
      embeddingModelId: "model-1",
      embeddingDimension: 3,
      indexingComplete: true,
    };
    await expect(engine.search("anything")).rejects.toBeInstanceOf(CodeIndexNotConfiguredError);
  });
});

describe("search — happy path", () => {
  it("embeds the query and returns store hits unchanged", async () => {
    const h = harness();
    h.files.set("src/a.ts", "alpha");
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });
    await engine.indexAll();

    const hits = await engine.search("find alpha");

    expect(hits.length).toBe(1);
    expect(hits[0]?.filePath).toBe("src/a.ts");
    expect(hits[0]?.score).toBe(0.9);
  });

  it("passes default minScore / maxResults to the store", async () => {
    const h = harness();
    h.files.set("a.ts", "alpha");
    let captured: { minScore: number; maxResults: number } | undefined;
    const origSearch = h.store.search.bind(h.store);
    h.store.search = async (k, v, opts) => {
      captured = { minScore: opts.minScore, maxResults: opts.maxResults };
      return origSearch(k, v, opts);
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });
    await engine.indexAll();

    await engine.search("q");

    expect(captured?.minScore).toBe(DEFAULT_MIN_SCORE);
    expect(captured?.maxResults).toBe(DEFAULT_MAX_RESULTS);
  });

  it("forwards caller minScore / maxResults / pathPrefix overrides", async () => {
    const h = harness();
    h.files.set("src/a.ts", "alpha");
    h.files.set("test/b.ts", "beta");
    let captured: { minScore: number; maxResults: number; pathPrefix?: string } | undefined;
    const origSearch = h.store.search.bind(h.store);
    h.store.search = async (k, v, opts) => {
      captured = {
        minScore: opts.minScore,
        maxResults: opts.maxResults,
        ...(opts.pathPrefix !== undefined ? { pathPrefix: opts.pathPrefix } : {}),
      };
      return origSearch(k, v, opts);
    };
    const engine = createIndexEngine({
      key: KEY,
      embedder: h.embedder,
      store: h.store,
      files: h.files,
      cache: h.cache,
      chunk: oneBlockChunk,
      languageOf: () => "ts",
      sleep: noopSleep,
    });
    await engine.indexAll();

    const hits = await engine.search("q", {
      minScore: 0.7,
      maxResults: 5,
      pathPrefix: "src/",
    });

    expect(captured?.minScore).toBe(0.7);
    expect(captured?.maxResults).toBe(5);
    expect(captured?.pathPrefix).toBe("src/");
    expect(hits.every((hh) => hh.filePath.startsWith("src/"))).toBe(true);
  });
});

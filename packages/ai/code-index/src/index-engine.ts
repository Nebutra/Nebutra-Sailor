/**
 * Incremental, tenant-scoped code-index engine — the orchestration core of the
 * codebase semantic-index grammar.
 *
 * ── What it does ────────────────────────────────────────────────────────────
 * Given an injected {@link Embedder}, {@link VectorStore}, {@link FileSource},
 * {@link IndexCacheStore}, and a pure chunk function, it keeps a tenant's
 * vector collection in lock-step with the repository:
 *
 *  1. **Profile gate.** It reads {@link IndexMetadata}. If absent, or if the
 *     active embedding profile (`provider` / `modelId` / `dimension`) differs
 *     from what produced the stored vectors, the stored vectors are
 *     *incomparable* — the collection is recreated and the file-hash cache is
 *     cleared. That run is a FULL scan; otherwise it is INCREMENTAL.
 *  2. **Mark incomplete.** `indexingComplete` is flipped to `false` *before*
 *     any mutation so a crash mid-run is observable and `search()` fails closed.
 *  3. **Diff by content hash.** Each listed file is hashed; a file whose hash
 *     matches the cache is skipped. A changed file is re-chunked, re-embedded,
 *     and written with delete-then-upsert so stale segments cannot linger.
 *  4. **Prune.** A path present in the cache but absent from the listing is
 *     deleted from the store and dropped from the cache.
 *  5. **Batch + retry.** Block embeddings are flushed in segments of
 *     {@link BATCH_SEGMENT_THRESHOLD}. Each embed/upsert is wrapped in pure,
 *     deterministic exponential backoff (`base * 2^attempt`) up to
 *     {@link MAX_BACKOFF_ATTEMPTS}; the `sleep` port defaults to a no-op so
 *     tests are instant.
 *  6. **Full-scan failure gate.** On a FULL scan, if more than
 *     {@link FULL_SCAN_FAILURE_GATE} of batches failed, the run hard-fails and
 *     `indexingComplete` is left `false` — a half-built index is never marked
 *     queryable.
 *  7. **Seal.** On success, metadata is written with the active profile and
 *     `indexingComplete = true`.
 *
 * ── Fail-closed retrieval ───────────────────────────────────────────────────
 * {@link CodeIndexEngine.search} refuses to return anything if the collection
 * is missing, incomplete, or its persisted embedding profile drifted from the
 * active embedder. It throws {@link CodeIndexNotConfiguredError} rather than
 * leaking stale or empty "looks fine" results.
 *
 * ── Determinism / immutability ──────────────────────────────────────────────
 * Point ids come from {@link deriveId}∘{@link CodeBlock.segmentHash}, so a
 * re-run over unchanged content yields byte-identical ids and upserts dedupe.
 * No input object is mutated; new arrays/objects are constructed throughout.
 */

import {
  type CodeBlock,
  CodeIndexNotConfiguredError,
  type CollectionKey,
  deriveId,
  type Embedder,
  type FileSource,
  fileHash,
  type IndexCacheStore,
  type IndexMetadata,
  POINT_ID_RE,
  type SearchHit,
  type SearchOptions,
  type VectorPoint,
  type VectorStore,
} from "./interfaces";

// ─── Tuning constants (exported — part of the engine's documented contract) ──

/** Largest file (bytes) the engine will read/chunk; bigger files are skipped. */
export const MAX_FILE_SIZE = 1_048_576;
/** Flush an embed batch once this many blocks have accumulated. */
export const BATCH_SEGMENT_THRESHOLD = 60;
/** Default retrieval floor: drop hits scoring below this. */
export const DEFAULT_MIN_SCORE = 0.4;
/** Default retrieval cap on returned hits. */
export const DEFAULT_MAX_RESULTS = 50;
/** Total embed/upsert attempts before a batch is declared failed. */
export const MAX_BACKOFF_ATTEMPTS = 5;
/** A FULL scan hard-fails when (failedBatches / totalBatches) exceeds this. */
export const FULL_SCAN_FAILURE_GATE = 0.1;

/** Backoff base delay (ms); growth is `BACKOFF_BASE_MS * 2^attempt`. */
const BACKOFF_BASE_MS = 50;

// ─── Engine surface ─────────────────────────────────────────────────────────

/** Injected, deterministic chunker. Sibling chunker is never imported here. */
export type ChunkFn = (args: {
  content: string;
  filePath: string;
  language: string;
}) => CodeBlock[];

export interface IndexEngineConfig {
  /** Tenant-scoped collection identity (from `collectionKey(...)`). */
  readonly key: CollectionKey;
  readonly embedder: Embedder;
  readonly store: VectorStore;
  readonly files: FileSource;
  readonly cache: IndexCacheStore;
  /** Pure chunk function — injected to keep the engine decoupled & testable. */
  readonly chunk: ChunkFn;
  /** Maps a path to a language tag for the chunker. */
  readonly languageOf: (path: string) => string;
  /** Skip files larger than this many bytes. Defaults to {@link MAX_FILE_SIZE}. */
  readonly maxFileSize?: number | undefined;
  /** Backoff sleep seam; defaults to a no-op so tests are instant. */
  readonly sleep?: ((ms: number) => Promise<void>) | undefined;
}

export interface CodeIndexEngine {
  /** Bring the tenant's vector collection in sync with the repository. */
  indexAll(): Promise<void>;
  /** Fail-closed semantic retrieval over the tenant's collection. */
  search(query: string, options?: SearchOptions): Promise<SearchHit[]>;
}

// ─── Internals ──────────────────────────────────────────────────────────────

interface EmbeddingProfile {
  readonly provider: string;
  readonly modelId: string;
  readonly dimension: number;
}

function profileOf(embedder: Embedder): EmbeddingProfile {
  return {
    provider: embedder.provider,
    modelId: embedder.modelId,
    dimension: embedder.dimension,
  };
}

function profileMatches(meta: IndexMetadata | undefined, profile: EmbeddingProfile): boolean {
  if (!meta) return false;
  return (
    meta.embeddingProvider === profile.provider &&
    meta.embeddingModelId === profile.modelId &&
    meta.embeddingDimension === profile.dimension
  );
}

/** A pending block plus its content-derived, validated point id. */
interface PendingBlock {
  readonly block: CodeBlock;
  readonly pointId: string;
}

const noopSleep = async (_ms: number): Promise<void> => {};

/**
 * Run `op` with pure exponential backoff. Returns `{ ok: true }` on success
 * or `{ ok: false }` once {@link MAX_BACKOFF_ATTEMPTS} is exhausted. Never
 * throws — the caller decides what a failed batch means (incremental vs gate).
 */
async function withBackoff(
  op: () => Promise<void>,
  sleep: (ms: number) => Promise<void>,
): Promise<{ ok: boolean }> {
  for (let attempt = 0; attempt < MAX_BACKOFF_ATTEMPTS; attempt += 1) {
    try {
      await op();
      return { ok: true };
    } catch {
      const isLast = attempt === MAX_BACKOFF_ATTEMPTS - 1;
      if (isLast) return { ok: false };
      // Pure deterministic delay: base * 2^attempt (no jitter — testable).
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }
  return { ok: false };
}

/**
 * Construct a tenant-scoped incremental code-index engine.
 *
 * The engine is bound to exactly one {@link CollectionKey} for its lifetime —
 * there is no cross-tenant write or read path by construction.
 */
export function createIndexEngine(config: IndexEngineConfig): CodeIndexEngine {
  const { key, embedder, store, files, cache, chunk, languageOf } = config;
  const maxFileSize = config.maxFileSize ?? MAX_FILE_SIZE;
  const sleep = config.sleep ?? noopSleep;

  async function markIncomplete(profile: EmbeddingProfile): Promise<void> {
    await store.setMetadata(key, {
      vectorSize: profile.dimension,
      embeddingProvider: profile.provider,
      embeddingModelId: profile.modelId,
      embeddingDimension: profile.dimension,
      indexingComplete: false,
    });
  }

  async function markComplete(profile: EmbeddingProfile): Promise<void> {
    await store.setMetadata(key, {
      vectorSize: profile.dimension,
      embeddingProvider: profile.provider,
      embeddingModelId: profile.modelId,
      embeddingDimension: profile.dimension,
      indexingComplete: true,
    });
  }

  /**
   * Embed + upsert one batch of pending blocks behind backoff.
   * Returns `true` on success, `false` once retries are exhausted.
   */
  async function flushBatch(batch: PendingBlock[]): Promise<boolean> {
    if (batch.length === 0) return true;
    const result = await withBackoff(async () => {
      const vectors = await embedder.embed(batch.map((p) => p.block.content));
      const points: VectorPoint[] = batch.map((p, i) => ({
        id: p.pointId,
        vector: vectors[i] ?? [],
        filePath: p.block.filePath,
        content: p.block.content,
        startLine: p.block.startLine,
        endLine: p.block.endLine,
      }));
      await store.upsert(key, points);
    }, sleep);
    return result.ok;
  }

  async function indexAll(): Promise<void> {
    const profile = profileOf(embedder);
    const meta = await store.getMetadata(key);
    const isFullScan = !profileMatches(meta, profile);

    if (isFullScan) {
      await store.recreate(key, profile.dimension);
      await cache.save(key, {});
    }

    // Fail-closed posture: an in-flight index is never queryable.
    await markIncomplete(profile);

    const previousCache = await cache.load(key);
    // Immutable working copy — never mutate the loaded cache object in place.
    const nextCache: Record<string, string> = { ...previousCache };

    const listed = await files.list();
    const seenPaths = new Set<string>();

    let totalBatches = 0;
    let failedBatches = 0;

    // Accumulate blocks across files; flush at the batch threshold so an
    // embedder that bills per call is not hammered per tiny file.
    let pending: PendingBlock[] = [];
    /** Files whose every batch succeeded — only these advance the cache. */
    const succeededPaths = new Set<string>();
    const failedPaths = new Set<string>();
    /** path → its file hash, applied to the cache once the run sealed it. */
    const pendingHashes = new Map<string, string>();
    /** path → whether any of its blocks landed in the current pending buffer. */
    let pendingPaths = new Set<string>();

    async function drain(): Promise<void> {
      if (pending.length === 0) return;
      const batch = pending;
      const pathsInBatch = pendingPaths;
      pending = [];
      pendingPaths = new Set<string>();
      totalBatches += 1;
      const ok = await flushBatch(batch);
      if (!ok) failedBatches += 1;
      for (const p of pathsInBatch) {
        if (ok) {
          if (!failedPaths.has(p)) succeededPaths.add(p);
        } else {
          failedPaths.add(p);
          succeededPaths.delete(p);
        }
      }
    }

    for (const stat of listed) {
      seenPaths.add(stat.path);

      if (stat.size > maxFileSize) {
        // Oversized: never read, never cached, pruned from store to be safe.
        await store.deleteByFilePath(key, stat.path);
        delete nextCache[stat.path];
        continue;
      }

      const content = await files.read(stat.path);
      const h = fileHash(content);

      if (!isFullScan && previousCache[stat.path] === h) {
        // Unchanged on an incremental scan — keep the cached hash, skip work.
        continue;
      }

      const language = languageOf(stat.path);
      const blocks = chunk({ content, filePath: stat.path, language });

      // Stale segments cannot linger: clear the file then re-upsert fresh.
      await store.deleteByFilePath(key, stat.path);
      pendingHashes.set(stat.path, h);

      if (blocks.length === 0) {
        // No blocks → nothing to embed; the (now-empty) file still "succeeds".
        succeededPaths.add(stat.path);
        continue;
      }

      for (const block of blocks) {
        const pointId = deriveId(block.segmentHash);
        // Defensive: only ever persist ids the store can round-trip.
        if (!POINT_ID_RE.test(pointId)) continue;
        pending.push({ block, pointId });
        pendingPaths.add(stat.path);
        if (pending.length >= BATCH_SEGMENT_THRESHOLD) {
          await drain();
        }
      }
    }

    // Flush the trailing partial batch.
    await drain();

    // Commit cache hashes only for fully-succeeded files; a failed file is
    // left uncached so the next run retries it.
    for (const [path, h] of pendingHashes) {
      if (succeededPaths.has(path) && !failedPaths.has(path)) {
        nextCache[path] = h;
      } else {
        delete nextCache[path];
      }
    }

    // Prune files that vanished from the listing.
    for (const path of Object.keys(previousCache)) {
      if (!seenPaths.has(path)) {
        await store.deleteByFilePath(key, path);
        delete nextCache[path];
      }
    }

    await cache.save(key, nextCache);

    if (isFullScan && totalBatches > 0 && failedBatches / totalBatches > FULL_SCAN_FAILURE_GATE) {
      // Hard-fail: leave indexingComplete=false so search() stays closed.
      throw new Error(
        `code-index full scan aborted: ${failedBatches}/${totalBatches} ` +
          `batches failed (> ${FULL_SCAN_FAILURE_GATE * 100}% gate)`,
      );
    }

    await markComplete(profile);
  }

  async function search(query: string, options?: SearchOptions): Promise<SearchHit[]> {
    const profile = profileOf(embedder);
    const meta = await store.getMetadata(key);

    if (!meta) {
      throw new CodeIndexNotConfiguredError(
        "code-index: no collection metadata — index has never been built",
      );
    }
    if (meta.indexingComplete !== true) {
      throw new CodeIndexNotConfiguredError(
        "code-index: index is incomplete — refusing to return partial results",
      );
    }
    if (!profileMatches(meta, profile)) {
      throw new CodeIndexNotConfiguredError(
        "code-index: embedding profile drifted from stored vectors — " + "rebuild required",
      );
    }

    const [vector] = await embedder.embed([query]);
    const searchArgs: Required<Pick<SearchOptions, "minScore" | "maxResults">> &
      Pick<SearchOptions, "pathPrefix"> = {
      minScore: options?.minScore ?? DEFAULT_MIN_SCORE,
      maxResults: options?.maxResults ?? DEFAULT_MAX_RESULTS,
      ...(options?.pathPrefix !== undefined ? { pathPrefix: options.pathPrefix } : {}),
    };

    // Store already applies score = 1 - distance and the score/cap filters;
    // return its hits unchanged (no re-ranking, no silent trimming).
    return store.search(key, vector ?? [], searchArgs);
  }

  return { indexAll, search };
}

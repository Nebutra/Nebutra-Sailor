/**
 * Port contracts + data model for the multi-tenant codebase semantic-index
 * grammar — a faithful re-expression of a coding agent's "index my repo so the
 * model can semantically retrieve code" subsystem into Sailor's grammar:
 * TypeScript, multi-tenant, no embedding-vendor lock-in, no vector-store
 * lock-in, no native tree-sitter dependency in this package.
 *
 * ── Why a separate package (not inside @nebutra/agent-runtime) ───────────────
 * Semantic code retrieval is orthogonal to the agent turn/loop. A search UI, a
 * RAG endpoint, or an editor "jump to similar code" feature can consume this
 * without an agent ever existing. So it carries the same `getX()`
 * provider-auto-detect seam as @nebutra/search / @nebutra/queue rather than
 * being a runtime module.
 *
 * ── Multi-tenancy (NON-NEGOTIABLE) ──────────────────────────────────────────
 * Every persisted vector lives under a {@link CollectionKey} derived from
 * `tenantId` + `project`. The key is Zod-validated and fails closed on empty
 * input — there is no tenant-agnostic write path. Cross-tenant reads are
 * impossible by construction because the {@link VectorStore} is always keyed.
 *
 * ── Fail-closed posture ─────────────────────────────────────────────────────
 * A retrieval against an unconfigured / incomplete index throws
 * {@link CodeIndexNotConfiguredError} rather than returning stale or empty
 * "looks fine" results. Silent degradation is forbidden.
 *
 * ── Determinism ─────────────────────────────────────────────────────────────
 * Chunk identity is content-addressed: {@link segmentHash} folds path + line
 * span + length + a content prefix; {@link fileHash} is the whole-file digest;
 * {@link deriveId} turns a segment hash into a stable vector-point id. Re-running
 * the indexer over unchanged content produces byte-identical ids, so upserts
 * dedupe and incremental scans can skip by hash.
 */

import { scopedKey, sha256 } from "@nebutra/ai-primitives";
import { z } from "zod";

// ─── Data model ─────────────────────────────────────────────────────────────

/**
 * One indexed unit of code. `identifier`/`type` describe the structural origin
 * (e.g. `function`, `class`, `markdown_section`, or `<type>_segment` for a
 * hard-split oversized leaf / line-chunk fallback).
 */
export interface CodeBlock {
  readonly filePath: string;
  readonly identifier: string | undefined;
  readonly type: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly content: string;
  /** Content-addressed chunk identity. See {@link segmentHash}. */
  readonly segmentHash: string;
  /** Whole-file digest the chunk was derived from. See {@link fileHash}. */
  readonly fileHash: string;
}

/** A point as stored in the vector backend. */
export interface VectorPoint {
  readonly id: string;
  readonly vector: number[];
  readonly filePath: string;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
}

/** A retrieval hit; `score` is `1 - distance` (higher = closer). */
export interface SearchHit {
  readonly id: string;
  readonly filePath: string;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly score: number;
}

export interface SearchOptions {
  /** Drop hits with `score < minScore`. Default chosen by the engine. */
  readonly minScore?: number;
  /** Hard cap on returned hits. */
  readonly maxResults?: number;
  /** Restrict to files whose path starts with this prefix (directory scope). */
  readonly pathPrefix?: string;
}

/**
 * Index-collection metadata. An embedding-profile mismatch
 * (`embeddingProvider` / `embeddingModelId` / `embeddingDimension`) means the
 * stored vectors are incomparable with the active embedder and the collection
 * MUST be recreated rather than queried.
 */
export interface IndexMetadata {
  readonly vectorSize: number;
  readonly embeddingProvider: string;
  readonly embeddingModelId: string;
  readonly embeddingDimension: number;
  readonly indexingComplete: boolean;
}

// ─── Tenant scoping ─────────────────────────────────────────────────────────

export const collectionKeyInput = z.object({
  tenantId: z.string().trim().min(1, "tenantId is required (fail-closed)"),
  project: z.string().trim().min(1, "project is required (fail-closed)"),
});
export type CollectionKeyInput = z.infer<typeof collectionKeyInput>;

/** An opaque, validated, tenant-scoped collection identity. */
export type CollectionKey = string & { readonly __brand: "CollectionKey" };

/**
 * Derive the tenant-scoped collection key. Throws (Zod) on empty tenant or
 * project — there is deliberately no unscoped fallback.
 */
export function collectionKey(input: CollectionKeyInput): CollectionKey {
  const { tenantId, project } = collectionKeyInput.parse(input);
  return scopedKey({ prefix: "ci", a: tenantId, b: project, separator: "\0" }) as CollectionKey;
}

// ─── Deterministic content-addressing ───────────────────────────────────────

export { sha256 };

/** Whole-file digest. */
export function fileHash(content: string): string {
  return sha256(content);
}

/**
 * Content-addressed chunk identity: folds path, line span, byte length, and a
 * 100-char content prefix so two textually-identical spans at different
 * locations stay distinct while unchanged spans stay stable.
 */
export function segmentHash(args: {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}): string {
  const prefix = args.content.slice(0, 100);
  return sha256(
    `${args.filePath}-${args.startLine}-${args.endLine}-${args.content.length}-${prefix}`,
  );
}

/**
 * Stable vector-point id from a segment hash. Deterministic and dependency-free
 * (no uuid library): a namespaced digest, formatted as a UUID-shaped string so
 * stores that validate id shape accept it.
 */
export function deriveId(segHash: string): string {
  const h = sha256(`code-index:point:${segHash}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20)
  }-${h.slice(20, 32)}`;
}

/** A point id is well-formed iff {@link deriveId} could have produced it. */
export const POINT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// ─── Ports (all injected — no vendor, FS, or network in this package) ────────

/**
 * Embedding provider. `provider` / `modelId` / `dimension` form the embedding
 * profile persisted in {@link IndexMetadata}; a change forces a recreate.
 */
export interface Embedder {
  readonly provider: string;
  readonly modelId: string;
  readonly dimension: number;
  /** Map each input text to a `dimension`-length vector, order-preserving. */
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Vector backend. The key is always a {@link CollectionKey}; implementations
 * MUST treat distinct keys as fully isolated namespaces.
 */
export interface VectorStore {
  ensureCollection(key: CollectionKey, dimension: number): Promise<void>;
  recreate(key: CollectionKey, dimension: number): Promise<void>;
  upsert(key: CollectionKey, points: VectorPoint[]): Promise<void>;
  deleteByFilePath(key: CollectionKey, filePath: string): Promise<void>;
  deleteByIds(key: CollectionKey, ids: string[]): Promise<void>;
  search(
    key: CollectionKey,
    vector: number[],
    options: Required<Pick<SearchOptions, "minScore" | "maxResults">> &
      Pick<SearchOptions, "pathPrefix">,
  ): Promise<SearchHit[]>;
  getMetadata(key: CollectionKey): Promise<IndexMetadata | undefined>;
  setMetadata(key: CollectionKey, meta: IndexMetadata): Promise<void>;
}

/** A structural-parser node, language-agnostic. */
export interface ParsedNode {
  readonly type: string;
  readonly identifier: string | undefined;
  readonly startLine: number;
  readonly endLine: number;
  readonly children: ParsedNode[];
}

/**
 * Optional structural parser. When absent the chunker degrades to the pure
 * line / markdown-header strategy — never throws, never blocks indexing.
 */
export interface CodeParser {
  /** Return the parse tree, or `undefined` if the language is unsupported. */
  parse(content: string, language: string): ParsedNode[] | undefined;
}

export interface FileStat {
  readonly path: string;
  readonly size: number;
  /** Opaque change token (mtime/etag/hash) — used only for cheap pre-filter. */
  readonly token: string;
}

/**
 * Repository file access. Injected so this package never touches a real FS;
 * the host decides what is in scope (and enforces its own tenancy on disk).
 */
export interface FileSource {
  list(): Promise<FileStat[]>;
  read(path: string): Promise<string>;
}

/**
 * Persisted per-collection file-hash cache (`{ [path]: fileHash }`). Injected:
 * the host owns where/how it persists; this package only reads/writes the map.
 */
export interface IndexCacheStore {
  load(key: CollectionKey): Promise<Record<string, string>>;
  save(key: CollectionKey, map: Record<string, string>): Promise<void>;
}

// ─── Fail-closed error ──────────────────────────────────────────────────────

/** Thrown by retrieval when the collection is missing / incomplete / drifted. */
export class CodeIndexNotConfiguredError extends Error {
  readonly code = "CODE_INDEX_NOT_CONFIGURED" as const;
  constructor(message: string) {
    super(message);
    this.name = "CodeIndexNotConfiguredError";
  }
}

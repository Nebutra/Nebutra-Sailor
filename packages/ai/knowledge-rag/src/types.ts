// =============================================================================
// @nebutra/knowledge-rag — Public types
// =============================================================================
// Multi-tenant hybrid RAG: ingestion → chunk → embed → vector + keyword index
// → hybrid retrieval → optional rerank.
//
// Every persisted record carries a tenantId. Tenant isolation is enforced at
// every store/query boundary — never optional.
// =============================================================================

import { z } from "zod";

// ── Documents & chunks ───────────────────────────────────────────────────────

export const IngestDocumentSchema = z.object({
  /** Globally unique document ID (caller-supplied). */
  id: z.string().min(1),
  /** Raw document text. */
  text: z.string().min(1),
  /** Tenant/workspace ID — REQUIRED. Every record is scoped to this. */
  tenantId: z.string().min(1),
  /** Arbitrary metadata propagated to every chunk and returned at query time. */
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type IngestDocument = z.infer<typeof IngestDocumentSchema>;

/** A persisted chunk. `tenantId` is non-nullable by construction. */
export interface KnowledgeChunk {
  /** Stable chunk ID: `${docId}::${ordinal}`. */
  readonly id: string;
  readonly docId: string;
  readonly tenantId: string;
  readonly text: string;
  /** 0-based position of the chunk within its source document. */
  readonly ordinal: number;
  readonly embedding: readonly number[];
  readonly meta: Readonly<Record<string, unknown>>;
}

/** A scored retrieval result. */
export interface RankedChunk {
  readonly chunk: KnowledgeChunk;
  /** Final blended score (0..1, higher is better). */
  readonly score: number;
  /** Per-leg scores for explainability. */
  readonly scores: {
    readonly vector: number;
    readonly keyword: number;
  };
  /** Which legs contributed. */
  readonly source: "hybrid" | "vector" | "keyword";
}

// ── Query ────────────────────────────────────────────────────────────────────

export const QueryInputSchema = z.object({
  query: z.string().min(1),
  tenantId: z.string().min(1),
  topK: z.number().int().min(1).max(100).optional(),
});

export type QueryInput = z.infer<typeof QueryInputSchema>;

// ── Pluggable internals ──────────────────────────────────────────────────────

export interface Chunker {
  /** Split text into chunk strings. Pure, deterministic. */
  split(text: string): string[];
}

export interface Embedder {
  readonly name: string;
  /** Embed a batch of strings into fixed-length vectors. */
  embed(texts: string[]): Promise<number[][]>;
}

export interface VectorStore {
  readonly name: string;
  upsert(chunks: KnowledgeChunk[]): Promise<void>;
  /** MUST filter by tenantId — cross-tenant leakage is a security defect. */
  queryByVector(
    tenantId: string,
    vector: readonly number[],
    topK: number,
  ): Promise<Array<{ chunk: KnowledgeChunk; score: number }>>;
  deleteByDoc(docId: string, tenantId: string): Promise<number>;
  /** Health probe for doctor(). */
  health(): Promise<{ ok: boolean; detail: string }>;
}

export interface Reranker {
  readonly name: string;
  rerank(query: string, candidates: RankedChunk[]): Promise<RankedChunk[]>;
}

// ── Top-level config & API ───────────────────────────────────────────────────

export interface KnowledgeRagConfig {
  chunker?: Chunker;
  embedder?: Embedder;
  vectorStore?: VectorStore;
  reranker?: Reranker;
  /** Logical index/namespace for the keyword leg. Default: "knowledge_rag". */
  index?: string;
  /** Vector-leg weight in the hybrid blend (0..1). Default 0.6. */
  vectorWeight?: number;
  /** Disable the keyword leg even if @nebutra/search is configured. */
  disableKeyword?: boolean;
}

export interface IngestResult {
  readonly docId: string;
  readonly tenantId: string;
  readonly chunks: number;
}

export interface DoctorReport {
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly durationMs: number;
  readonly components: Array<{
    readonly name: string;
    readonly ok: boolean;
    readonly detail: string;
  }>;
}

export interface KnowledgeRag {
  ingest(doc: IngestDocument): Promise<IngestResult>;
  query(input: QueryInput): Promise<RankedChunk[]>;
  deleteByDoc(docId: string, tenantId: string): Promise<number>;
  doctor(): Promise<DoctorReport>;
}

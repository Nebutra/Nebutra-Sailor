// =============================================================================
// @nebutra/knowledge-rag — Public API
// =============================================================================
// Multi-tenant hybrid RAG: ingest → semantic chunk → embed → vector + keyword
// index → hybrid retrieval → optional rerank.
//
// Zero-config:
//
//   import { getKnowledgeRag } from "@nebutra/knowledge-rag";
//   const kb = await getKnowledgeRag();
//   await kb.ingest({ id: "d1", tenantId: "org_a", text: "..." });
//   const hits = await kb.query({ query: "...", tenantId: "org_a" });
//
// Defaults: in-memory vector store + deterministic local embedder, keyword
// leg auto-enabled only if a @nebutra/search backend is detected. NO env
// required. Every persisted record carries a tenantId.
// =============================================================================

import { createKnowledgeRag } from "./pipeline";
import type { DoctorReport, KnowledgeRag, KnowledgeRagConfig } from "./types";

let singleton: KnowledgeRag | null = null;

/**
 * Returns a process-wide KnowledgeRag instance. Pass a config to override any
 * pluggable internal; the first non-empty config wins for the singleton.
 * Construct a fresh isolated instance with `createKnowledgeRag()` instead.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getKnowledgeRag(config?: KnowledgeRagConfig): Promise<KnowledgeRag> {
  if (config) return createKnowledgeRag(config);
  if (!singleton) singleton = createKnowledgeRag();
  return singleton;
}

/** Standalone health probe (also available as instance method). <3s. */
export async function doctor(config?: KnowledgeRagConfig): Promise<DoctorReport> {
  const kb = await getKnowledgeRag(config);
  return kb.doctor();
}

/** Reset the singleton (tests / re-config). */
export function resetKnowledgeRag(): void {
  singleton = null;
}

export { RecursiveCharChunker } from "./chunker";
export { LocalHashEmbedder, ProviderEmbedder } from "./embedder";
export { KnowledgeRagError } from "./errors";
export { SearchKeywordIndex } from "./keyword";
// ── Building blocks (advanced / custom wiring) ───────────────────────────────
export { createKnowledgeRag } from "./pipeline";
export { IdentityReranker, LexicalOverlapReranker } from "./reranker";
export { cosineSimilarity, hybridBlend, normalizeScores } from "./scoring";
export { InMemoryVectorStore } from "./stores/memory";
export { PgvectorStore } from "./stores/pgvector";
// ── Tool factory (for @nebutra/agent-runtime / agents) ───────────────────────
export { createKnowledgeRagTool } from "./tool";

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  Chunker,
  DoctorReport,
  Embedder,
  IngestDocument,
  IngestResult,
  KnowledgeChunk,
  KnowledgeRag,
  KnowledgeRagConfig,
  QueryInput,
  RankedChunk,
  Reranker,
  VectorStore,
} from "./types";
export { IngestDocumentSchema, QueryInputSchema } from "./types";

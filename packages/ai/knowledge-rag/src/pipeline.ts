// =============================================================================
// @nebutra/knowledge-rag — Pipeline
// =============================================================================
// ingest:  validate → chunk → embed → vector upsert + keyword index
// query:   validate → embed query → vector leg + keyword leg → hybrid blend
//          → optional rerank → topK
// delete:  scoped by (docId, tenantId) across both legs
//
// tenantId is required on every input and threaded into every store call.
// Tenant isolation is enforced by the stores; the pipeline never widens scope.
// =============================================================================

import { RecursiveCharChunker } from "./chunker";
import { LocalHashEmbedder } from "./embedder";
import { KnowledgeRagError } from "./errors";
import type { KeywordIndex } from "./keyword";
import { SearchKeywordIndex } from "./keyword";
import { IdentityReranker } from "./reranker";
import { hybridBlend, normalizeScores } from "./scoring";
import { InMemoryVectorStore } from "./stores/memory";
import {
  type DoctorReport,
  type IngestDocument,
  IngestDocumentSchema,
  type IngestResult,
  type KnowledgeChunk,
  type KnowledgeRag,
  type KnowledgeRagConfig,
  type QueryInput,
  QueryInputSchema,
  type RankedChunk,
} from "./types";

const DEFAULT_INDEX = "knowledge_rag";
const DEFAULT_VECTOR_WEIGHT = 0.6;
const DEFAULT_TOP_K = 8;

class KnowledgeRagPipeline implements KnowledgeRag {
  private readonly chunker;
  private readonly embedder;
  private readonly store;
  private readonly reranker;
  private readonly indexName: string;
  private readonly vectorWeight: number;
  private readonly disableKeyword: boolean;
  private keyword: KeywordIndex | null = null;
  private keywordResolved = false;

  constructor(config: KnowledgeRagConfig = {}) {
    this.chunker = config.chunker ?? new RecursiveCharChunker({ size: 800, overlap: 100 });
    this.embedder = config.embedder ?? new LocalHashEmbedder(256);
    this.store = config.vectorStore ?? new InMemoryVectorStore();
    this.reranker = config.reranker ?? new IdentityReranker();
    this.indexName = config.index ?? DEFAULT_INDEX;
    this.vectorWeight = config.vectorWeight ?? DEFAULT_VECTOR_WEIGHT;
    this.disableKeyword = config.disableKeyword ?? false;
  }

  /** Lazily resolve the keyword leg; null when no search backend / disabled. */
  private async keywordIndex(): Promise<KeywordIndex | null> {
    if (this.disableKeyword) return null;
    if (this.keywordResolved) return this.keyword;
    this.keyword = await SearchKeywordIndex.tryCreate(this.indexName);
    this.keywordResolved = true;
    return this.keyword;
  }

  async ingest(doc: IngestDocument): Promise<IngestResult> {
    const parsed = IngestDocumentSchema.safeParse(doc);
    if (!parsed.success) {
      throw new KnowledgeRagError(
        `Invalid ingest document: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
        {
          code: "E_INGEST_INPUT",
          suggestion:
            "ingest() requires { id, text, tenantId } all non-empty. tenantId is mandatory — every record is tenant-scoped.",
        },
      );
    }
    const { id, text, tenantId, meta = {} } = parsed.data;
    const pieces = this.chunker.split(text);
    if (pieces.length === 0) {
      return { docId: id, tenantId, chunks: 0 };
    }
    const vectors = await this.embedder.embed(pieces);
    const chunks: KnowledgeChunk[] = pieces.map((t, ordinal) => ({
      id: `${id}::${ordinal}`,
      docId: id,
      tenantId,
      text: t,
      ordinal,
      embedding: vectors[ordinal]!,
      meta,
    }));
    await this.store.upsert(chunks);
    const kw = await this.keywordIndex();
    if (kw) await kw.index(chunks);
    return { docId: id, tenantId, chunks: chunks.length };
  }

  async query(input: QueryInput): Promise<RankedChunk[]> {
    const parsed = QueryInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new KnowledgeRagError(
        `Invalid query input: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
        {
          code: "E_QUERY_INPUT",
          suggestion: "query() requires { query, tenantId } non-empty; topK is 1..100.",
        },
      );
    }
    const { query, tenantId } = parsed.data;
    const topK = parsed.data.topK ?? DEFAULT_TOP_K;
    const fetchK = Math.max(topK * 4, topK);

    const [queryVec] = await this.embedder.embed([query]);
    const vectorHits = await this.store.queryByVector(tenantId, queryVec!, fetchK);

    const kw = await this.keywordIndex();
    const keywordHits = kw ? await kw.search(tenantId, query, fetchK) : [];

    // Merge candidate set keyed by chunkId. Defence in depth: drop anything
    // whose tenantId doesn't match the requested tenant.
    const byId = new Map<string, { chunk: KnowledgeChunk; vec: number; kw: number }>();
    for (const h of vectorHits) {
      if (h.chunk.tenantId !== tenantId) continue;
      byId.set(h.chunk.id, { chunk: h.chunk, vec: h.score, kw: 0 });
    }
    for (const h of keywordHits) {
      if (h.tenantId !== tenantId) continue;
      const existing = byId.get(h.chunkId);
      if (existing) existing.kw = h.score;
      // Keyword-only hits with no embedding context are skipped: the vector
      // store is the source of truth for chunk bodies in this pipeline.
    }

    const entries = [...byId.values()];
    if (entries.length === 0) return [];

    const normVec = normalizeScores(entries.map((e) => e.vec));
    const normKw = normalizeScores(entries.map((e) => e.kw));
    const hasKeyword = keywordHits.length > 0;

    const ranked: RankedChunk[] = entries.map((e, i) => {
      const v = normVec[i]!;
      const k = normKw[i]!;
      const blended = hasKeyword ? hybridBlend(v, k, this.vectorWeight) : v;
      return {
        chunk: e.chunk,
        score: blended,
        scores: { vector: v, keyword: k },
        source: hasKeyword ? "hybrid" : "vector",
      };
    });
    ranked.sort((a, b) => b.score - a.score);

    const reranked = await this.reranker.rerank(query, ranked);
    return reranked.slice(0, topK);
  }

  async deleteByDoc(docId: string, tenantId: string): Promise<number> {
    if (!docId || !tenantId) {
      throw new KnowledgeRagError("deleteByDoc requires docId and tenantId", {
        code: "E_DELETE_INPUT",
        suggestion: "Pass both docId and tenantId — deletion is always tenant-scoped.",
      });
    }
    const removed = await this.store.deleteByDoc(docId, tenantId);
    const kw = await this.keywordIndex();
    if (kw) {
      try {
        await kw.deleteByDoc(docId, tenantId);
      } catch {
        // Keyword cleanup is best-effort; vector store is authoritative.
      }
    }
    return removed;
  }

  async doctor(): Promise<DoctorReport> {
    const start = Date.now();
    const components: DoctorReport["components"] = [];

    components.push({
      name: `embedder:${this.embedder.name}`,
      ok: true,
      detail:
        this.embedder.name === "local-hash"
          ? "zero-config deterministic local embedder (no network)"
          : "provider embedder configured",
    });

    try {
      const h = await withTimeout(this.store.health(), 1500);
      components.push({ name: `vector-store:${this.store.name}`, ok: h.ok, detail: h.detail });
    } catch (err) {
      components.push({
        name: `vector-store:${this.store.name}`,
        ok: false,
        detail: `health timed out: ${(err as Error).message}`,
      });
    }

    if (this.disableKeyword) {
      components.push({
        name: "keyword-index",
        ok: true,
        detail: "disabled by config (vector-only retrieval)",
      });
    } else {
      try {
        const kw = await withTimeout(this.keywordIndex(), 1500);
        if (kw) {
          const h = await withTimeout(kw.health(), 1000);
          components.push({ name: "keyword-index:@nebutra/search", ok: h.ok, detail: h.detail });
        } else {
          components.push({
            name: "keyword-index",
            ok: true,
            detail: "no @nebutra/search backend detected — degraded to vector-only",
          });
        }
      } catch (err) {
        components.push({
          name: "keyword-index",
          ok: false,
          detail: `probe failed: ${(err as Error).message}`,
        });
      }
    }

    return {
      ok: components.every((c) => c.ok),
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      components,
    };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new KnowledgeRagError(`timeout after ${ms}ms`, {
              code: "E_HEALTH_TIMEOUT",
              suggestion: "External dependency is slow/unreachable; check its URL/credentials.",
            }),
          ),
        ms,
      ),
    ),
  ]);
}

/** Synchronous factory — fully usable with zero config. */
export function createKnowledgeRag(config: KnowledgeRagConfig = {}): KnowledgeRag {
  return new KnowledgeRagPipeline(config);
}

// =============================================================================
// @nebutra/knowledge-rag — Keyword leg (wraps @nebutra/search)
// =============================================================================
// Rather than reinventing a keyword index, this WRAPS the existing
// provider-agnostic @nebutra/search abstraction (Meilisearch / Typesense /
// Algolia / pgvector-BM25). Each chunk is indexed as a SearchDocument carrying
// tenantId; every query filters by { tenantId } so the keyword leg has the
// same tenant-isolation guarantee as the vector leg.
//
// @nebutra/search is imported lazily so the zero-config path (keyword
// disabled, no search backend) never needs it at module load.
// =============================================================================

import { KnowledgeRagError } from "./errors";
import type { KnowledgeChunk } from "./types";

export interface KeywordHit {
  chunkId: string;
  docId: string;
  tenantId: string;
  score: number;
}

export interface KeywordIndex {
  index(chunks: KnowledgeChunk[]): Promise<void>;
  search(tenantId: string, query: string, topK: number): Promise<KeywordHit[]>;
  deleteByDoc(docId: string, tenantId: string): Promise<void>;
  health(): Promise<{ ok: boolean; detail: string }>;
}

/**
 * KeywordIndex backed by @nebutra/search. Construct via
 * `SearchKeywordIndex.tryCreate(indexName)` which returns `null` when no
 * search backend is configured (so the pipeline can degrade to vector-only).
 */
export class SearchKeywordIndex implements KeywordIndex {
  // biome-ignore lint/suspicious/noExplicitAny: external provider type imported lazily
  private readonly provider: any;
  private readonly indexName: string;

  // biome-ignore lint/suspicious/noExplicitAny: external provider type imported lazily
  private constructor(provider: any, indexName: string) {
    this.provider = provider;
    this.indexName = indexName;
  }

  /**
   * Returns a live keyword index, or `null` when no @nebutra/search backend
   * is genuinely reachable. The default provider auto-detects to Meilisearch
   * even with no env; it only fails on the first network call. So we probe
   * with a real createIndex/search call and degrade to vector-only on any
   * failure — the zero-config path must NEVER break because a search server
   * happens to be absent.
   */
  static async tryCreate(indexName: string): Promise<SearchKeywordIndex | null> {
    try {
      const mod = await import("@nebutra/search");
      const search = await mod.getSearch();
      try {
        await search.createIndex(indexName, {
          primaryKey: "id",
          filterableAttributes: ["tenantId", "docId"],
          searchableAttributes: ["text"],
        });
      } catch {
        // createIndex may fail because the index already exists (fine) OR
        // because the backend is unreachable (not fine). Disambiguate with a
        // cheap reachability probe.
        try {
          await search.search(indexName, { query: "", hitsPerPage: 1 });
        } catch {
          return null; // backend not reachable — degrade to vector-only
        }
      }
      return new SearchKeywordIndex(search, indexName);
    } catch {
      return null;
    }
  }

  async index(chunks: KnowledgeChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await this.provider.indexDocuments(
      this.indexName,
      chunks.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        docId: c.docId,
        text: c.text,
      })),
    );
  }

  async search(tenantId: string, query: string, topK: number): Promise<KeywordHit[]> {
    try {
      const result = await this.provider.search(this.indexName, {
        query,
        tenantId,
        filters: { tenantId },
        hitsPerPage: Math.min(100, Math.max(1, topK)),
      });
      return (result.hits ?? [])
        .filter((h: { doc: { tenantId?: string } }) => h.doc.tenantId === tenantId)
        .map((h: { doc: { id: string; docId: string; tenantId: string }; score: number }) => ({
          chunkId: h.doc.id,
          docId: h.doc.docId,
          tenantId: h.doc.tenantId,
          score: h.score,
        }));
    } catch (err) {
      throw new KnowledgeRagError(
        `Keyword search failed: ${(err as Error)?.message ?? String(err)}`,
        {
          code: "E_KEYWORD_SEARCH",
          cause: err,
          suggestion:
            "Check the @nebutra/search backend (MEILISEARCH_URL / TYPESENSE_URL / ALGOLIA_APP_ID), or set { disableKeyword: true } for vector-only retrieval.",
        },
      );
    }
  }

  async deleteByDoc(docId: string, tenantId: string): Promise<void> {
    await this.provider.deleteByFilter(this.indexName, { docId, tenantId });
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    try {
      await this.provider.search(this.indexName, { query: "", hitsPerPage: 1 });
      return { ok: true, detail: `@nebutra/search: index "${this.indexName}" reachable` };
    } catch (err) {
      return {
        ok: false,
        detail: `@nebutra/search unreachable: ${(err as Error)?.message ?? String(err)}`,
      };
    }
  }
}

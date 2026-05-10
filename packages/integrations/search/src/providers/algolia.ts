import { logger } from "@nebutra/logger";
import { algoliasearch } from "algoliasearch";
import type {
  AlgoliaConfig,
  IndexSettings,
  SearchDocument,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "../types.js";

// =============================================================================
// Algolia Provider — Managed SaaS, global CDN, zero-ops
// =============================================================================

export class AlgoliaProvider implements SearchProvider {
  readonly name = "algolia";
  private searchClient: any;
  private adminClient: any;

  constructor(config?: AlgoliaConfig) {
    const _appId = config?.appId ?? process.env.ALGOLIA_APP_ID;
    const searchKey = config?.searchKey ?? process.env.ALGOLIA_SEARCH_KEY;
    const adminKey = config?.adminKey ?? process.env.ALGOLIA_ADMIN_KEY;

    if (!_appId) {
      throw new Error("[search:algolia] Missing ALGOLIA_APP_ID environment variable");
    }

    if (!searchKey) {
      throw new Error("[search:algolia] Missing ALGOLIA_SEARCH_KEY environment variable");
    }

    if (!adminKey) {
      throw new Error("[search:algolia] Missing ALGOLIA_ADMIN_KEY environment variable");
    }

    this.searchClient = algoliasearch(_appId, searchKey);
    this.adminClient = algoliasearch(_appId, adminKey);

    logger.info("[search:algolia] Initializing", { appId: _appId });
  }

  async indexDocument<T extends SearchDocument>(index: string, doc: T): Promise<void> {
    try {
      const indexName = this._getIndexName(index, doc.tenantId);
      const algoliaIndex = this.adminClient.initIndex(indexName);
      const record = this._prepareRecord(doc);
      await algoliaIndex.saveObject(record);
      logger.debug("[search:algolia] Indexed document", {
        index: indexName,
        docId: doc.id,
      });
    } catch (error) {
      logger.error("[search:algolia] Failed to index document", {
        index,
        docId: doc.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async indexDocuments<T extends SearchDocument>(index: string, docs: T[]): Promise<void> {
    if (docs.length === 0) return;

    try {
      // Group documents by tenant
      const byTenant = new Map<string | undefined, T[]>();
      for (const doc of docs) {
        const tenant = doc.tenantId;
        if (!byTenant.has(tenant)) {
          byTenant.set(tenant, []);
        }
        byTenant.get(tenant)!.push(doc);
      }

      // Index each tenant's documents
      for (const [tenantId, tenantDocs] of byTenant.entries()) {
        const indexName = this._getIndexName(index, tenantId);
        const algoliaIndex = this.adminClient.initIndex(indexName);
        const records = tenantDocs.map((doc) => this._prepareRecord(doc));
        await algoliaIndex.saveObjects(records);

        logger.debug("[search:algolia] Indexed batch", {
          index: indexName,
          count: tenantDocs.length,
        });
      }
    } catch (error) {
      logger.error("[search:algolia] Failed to index batch", {
        index,
        count: docs.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async search<T extends SearchDocument = SearchDocument>(
    index: string,
    query: SearchQuery,
  ): Promise<SearchResult<T>> {
    try {
      const indexName = this._getIndexName(index, query.tenantId);
      const algoliaIndex = this.searchClient.initIndex(indexName);
      const page = query.page ?? 1;
      const hitsPerPage = Math.min(query.hitsPerPage ?? 20, 100);

      // Build facet filters
      const facetFilters: string[] = [];
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          if (typeof value === "string") {
            facetFilters.push(`${key}:${value}`);
          } else if (typeof value === "number") {
            facetFilters.push(`${key}:${value}`);
          } else if (typeof value === "boolean") {
            facetFilters.push(`${key}:${value}`);
          }
        }
      }

      if (query.tenantId) {
        facetFilters.push(`tenantId:${query.tenantId}`);
      }

      const startMs = performance.now();
      const result = await algoliaIndex.search(query.query, {
        page: page - 1, // Algolia uses 0-based pagination
        hitsPerPage,
        facets: query.facets,
        facetFilters,
        typoTolerance: query.typoTolerance !== false,
        highlightPreTag: "<mark>",
        highlightPostTag: "</mark>",
        attributesToHighlight: query.highlightFields,
        attributesToSnippet: query.highlightFields ? undefined : undefined,
      });
      const processingTimeMs = performance.now() - startMs;

      const hits = result.hits.map((hit: any) => ({
        doc: this._unprepareRecord(hit) as T,
        score: hit._rankingInfo?.nbExactMatches ?? hit._score ?? 1,
        highlights: hit._highlightResult
          ? Object.fromEntries(
              Object.entries(hit._highlightResult).map(([key, val]: [string, any]) => [
                key,
                val.value,
              ]),
            )
          : undefined,
      }));

      const totalPages = Math.ceil(result.nbHits / hitsPerPage);

      const facetDistribution: Record<string, Record<string, number>> = {};
      if (result.facets) {
        for (const [facetName, facetValues] of Object.entries(result.facets)) {
          facetDistribution[facetName] = facetValues as Record<string, number>;
        }
      }

      logger.debug("[search:algolia] Search completed", {
        index: indexName,
        query: query.query,
        hits: hits.length,
        totalHits: result.nbHits,
        processingTimeMs,
      });

      return {
        hits,
        totalHits: result.nbHits,
        processingTimeMs,
        facetDistribution:
          (Object.keys(facetDistribution).length > 0 ? facetDistribution : undefined) ?? {},
        page,
        hitsPerPage,
        totalPages,
      };
    } catch (error) {
      logger.error("[search:algolia] Search failed", {
        index,
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteDocument(index: string, docId: string, tenantId?: string): Promise<void> {
    try {
      const indexName = this._getIndexName(index, tenantId);
      const algoliaIndex = this.adminClient.initIndex(indexName);
      await algoliaIndex.deleteObject(docId);
      logger.debug("[search:algolia] Deleted document", {
        index: indexName,
        docId,
      });
    } catch (error) {
      logger.error("[search:algolia] Failed to delete document", {
        index,
        docId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteByFilter(
    index: string,
    filters: Record<string, string | number | boolean>,
  ): Promise<void> {
    try {
      const indexName = this._getIndexName(index);
      const algoliaIndex = this.adminClient.initIndex(indexName);

      // Build facet filters
      const facetFilters: string[] = [];
      for (const [key, value] of Object.entries(filters)) {
        if (typeof value === "string") {
          facetFilters.push(`${key}:${value}`);
        } else if (typeof value === "number") {
          facetFilters.push(`${key}:${value}`);
        } else if (typeof value === "boolean") {
          facetFilters.push(`${key}:${value}`);
        }
      }

      // Search for matching documents
      const result = await this.searchClient.initIndex(indexName).search("", {
        facetFilters,
        hitsPerPage: 10000,
      });

      if (result.hits.length > 0) {
        const docIds = result.hits.map((hit: any) => hit.objectID);
        await algoliaIndex.deleteObjects(docIds);
        logger.debug("[search:algolia] Deleted documents by filter", {
          index: indexName,
          filters,
          deletedCount: docIds.length,
        });
      }
    } catch (error) {
      logger.error("[search:algolia] Failed to delete by filter", {
        index,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createIndex(index: string, settings: IndexSettings): Promise<void> {
    try {
      const indexName = this._getIndexName(index);
      const algoliaIndex = this.adminClient.initIndex(indexName);

      // Apply settings
      await this._applySettings(algoliaIndex, settings);
      logger.info("[search:algolia] Index created/configured", { index: indexName });
    } catch (error) {
      logger.error("[search:algolia] Failed to create index", {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateSettings(index: string, settings: IndexSettings): Promise<void> {
    try {
      const indexName = this._getIndexName(index);
      const algoliaIndex = this.adminClient.initIndex(indexName);
      await this._applySettings(algoliaIndex, settings);
      logger.info("[search:algolia] Settings updated", { index: indexName });
    } catch (error) {
      logger.error("[search:algolia] Failed to update settings", {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    logger.info("[search:algolia] Closing connection");
    // Algolia doesn't require explicit connection cleanup
  }

  // ─────────────────────────────────────────────────────────────────────────

  private _getIndexName(baseIndex: string, tenantId?: string): string {
    if (tenantId) {
      return `${baseIndex}__${tenantId}`;
    }
    return baseIndex;
  }

  private _prepareRecord(doc: SearchDocument): Record<string, unknown> {
    return {
      objectID: doc.id,
      ...doc,
    };
  }

  private _unprepareRecord(record: any): SearchDocument {
    const { objectID, ...rest } = record;
    return {
      id: objectID,
      ...rest,
    };
  }

  private async _applySettings(index: any, settings: IndexSettings): Promise<void> {
    const algoliaSettings: any = {};

    if (settings.searchableAttributes) {
      algoliaSettings.searchableAttributes = settings.searchableAttributes;
    }

    if (settings.filterableAttributes) {
      algoliaSettings.filterableAttributes = settings.filterableAttributes;
    }

    if (settings.facetableAttributes) {
      algoliaSettings.facets = settings.facetableAttributes;
    }

    if (settings.rankingRules) {
      algoliaSettings.ranking = settings.rankingRules;
    }

    if (settings.synonyms) {
      // Algolia uses different synonym format, skip for now
    }

    if (Object.keys(algoliaSettings).length > 0) {
      await index.setSettings(algoliaSettings);
    }
  }
}

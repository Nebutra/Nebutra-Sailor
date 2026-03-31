import { logger } from "@nebutra/logger";
import { MeiliSearch } from "meilisearch";
import type {
  IndexSettings,
  MeilisearchConfig,
  SearchDocument,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "../types.js";

// =============================================================================
// Meilisearch Provider — Developer-friendly, typo-tolerant search
// =============================================================================

export class MeilisearchProvider implements SearchProvider {
  readonly name = "meilisearch";
  private client: MeiliSearch;

  constructor(config?: MeilisearchConfig) {
    const url = config?.url ?? process.env.MEILISEARCH_URL ?? "http://localhost:7700";
    const _apiKey = config?.apiKey ?? process.env.MEILISEARCH_API_KEY;
    const timeout = config?.timeout ?? 30000;

    logger.info("[search:meilisearch] Initializing", { url });

    const clientConfig: any = {
      host: url,
      timeout,
    };
    if (_apiKey) {
      clientConfig.apiKey = _apiKey;
    }
    this.client = new MeiliSearch(clientConfig);
  }

  async indexDocument<T extends SearchDocument>(index: string, doc: T): Promise<void> {
    try {
      const indexWithTenant = this._getTenantIndex(index, doc.tenantId);
      await this.client.index(indexWithTenant).addDocuments([doc as Record<string, unknown>]);
      logger.debug("[search:meilisearch] Indexed document", {
        index: indexWithTenant,
        docId: doc.id,
      });
    } catch (error) {
      logger.error("[search:meilisearch] Failed to index document", {
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
      // Group documents by tenant for proper filtering
      const byTenant = new Map<string | undefined, T[]>();
      for (const doc of docs) {
        const tenant = doc.tenantId;
        if (!byTenant.has(tenant)) {
          byTenant.set(tenant, []);
        }
        byTenant.get(tenant)!.push(doc);
      }

      // Index each tenant's documents to their own index
      for (const [tenantId, tenantDocs] of byTenant.entries()) {
        const indexWithTenant = this._getTenantIndex(index, tenantId);
        await this.client
          .index(indexWithTenant)
          .addDocuments(tenantDocs as Record<string, unknown>[]);

        logger.debug("[search:meilisearch] Indexed batch", {
          index: indexWithTenant,
          count: tenantDocs.length,
        });
      }
    } catch (error) {
      logger.error("[search:meilisearch] Failed to index batch", {
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
      const indexWithTenant = this._getTenantIndex(index, query.tenantId);
      const page = query.page ?? 1;
      const hitsPerPage = Math.min(query.hitsPerPage ?? 20, 100);
      const offset = (page - 1) * hitsPerPage;

      // Build filter string for Meilisearch
      let filter: string | undefined;
      if (query.filters || query.tenantId) {
        const filterParts: string[] = [];

        // Add tenant filter if present
        if (query.tenantId) {
          filterParts.push(`tenantId = "${query.tenantId}"`);
        }

        // Add additional filters
        if (query.filters) {
          for (const [key, value] of Object.entries(query.filters)) {
            if (typeof value === "string") {
              filterParts.push(`${key} = "${value}"`);
            } else if (typeof value === "number") {
              filterParts.push(`${key} = ${value}`);
            } else if (typeof value === "boolean") {
              filterParts.push(`${key} = ${value}`);
            }
          }
        }

        if (filterParts.length > 0) {
          filter = filterParts.join(" AND ");
        }
      }

      const startMs = performance.now();
      const searchParams: any = {
        offset,
        limit: hitsPerPage,
        highlightPreTag: "<mark>",
        highlightPostTag: "</mark>",
      };
      if (filter !== undefined) searchParams.filter = filter;
      if (query.facets !== undefined) searchParams.facets = query.facets;
      if (query.sort !== undefined) searchParams.sort = query.sort;
      if (query.highlightFields !== undefined)
        searchParams.attributesToHighlight = query.highlightFields;

      const result = await this.client.index(indexWithTenant).search(query.query, searchParams);
      const processingTimeMs = performance.now() - startMs;

      const hits = (result.hits || []).map((hit: any) => ({
        doc: hit as T,
        score: hit._rankingScore ?? 1,
        highlights: hit._formatted ?? undefined,
      }));

      const totalHits = result.estimatedTotalHits ?? 0;
      const totalPages = Math.ceil(totalHits / hitsPerPage);

      logger.debug("[search:meilisearch] Search completed", {
        index: indexWithTenant,
        query: query.query,
        hits: hits.length,
        totalHits,
        processingTimeMs,
      });

      return {
        hits,
        totalHits,
        processingTimeMs,
        facetDistribution: result.facetDistribution ?? {},
        page,
        hitsPerPage,
        totalPages,
      };
    } catch (error) {
      logger.error("[search:meilisearch] Search failed", {
        index,
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteDocument(index: string, docId: string, tenantId?: string): Promise<void> {
    try {
      const indexWithTenant = this._getTenantIndex(index, tenantId);
      await this.client.index(indexWithTenant).deleteDocument(docId);
      logger.debug("[search:meilisearch] Deleted document", {
        index: indexWithTenant,
        docId,
      });
    } catch (error) {
      logger.error("[search:meilisearch] Failed to delete document", {
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
      // Build filter string
      const filterParts: string[] = [];
      for (const [key, value] of Object.entries(filters)) {
        if (typeof value === "string") {
          filterParts.push(`${key} = "${value}"`);
        } else if (typeof value === "number") {
          filterParts.push(`${key} = ${value}`);
        } else if (typeof value === "boolean") {
          filterParts.push(`${key} = ${value}`);
        }
      }

      const filter = filterParts.join(" AND ");

      // Meilisearch doesn't have a direct deleteByFilter, so we search then delete
      const result = await this.client.index(index).search("", {
        filter,
        limit: 10000,
      });

      if (result.hits.length > 0) {
        const docIds = result.hits.map((hit: any) => hit.id);
        await this.client.index(index).deleteDocuments(docIds);
        logger.debug("[search:meilisearch] Deleted documents by filter", {
          index,
          filters,
          deletedCount: docIds.length,
        });
      }
    } catch (error) {
      logger.error("[search:meilisearch] Failed to delete by filter", {
        index,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createIndex(index: string, settings: IndexSettings): Promise<void> {
    try {
      // Meilisearch creates indices on-demand, so we update settings instead
      await this._applySettings(index, settings);
      logger.info("[search:meilisearch] Index created/configured", { index });
    } catch (error) {
      logger.error("[search:meilisearch] Failed to create index", {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateSettings(index: string, settings: IndexSettings): Promise<void> {
    try {
      await this._applySettings(index, settings);
      logger.info("[search:meilisearch] Settings updated", { index });
    } catch (error) {
      logger.error("[search:meilisearch] Failed to update settings", {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    logger.info("[search:meilisearch] Closing connection");
    // Meilisearch doesn't require explicit connection cleanup
  }

  // ─────────────────────────────────────────────────────────────────────────

  private _getTenantIndex(baseIndex: string, tenantId?: string): string {
    if (tenantId) {
      return `${baseIndex}__${tenantId}`;
    }
    return baseIndex;
  }

  private async _applySettings(index: string, settings: IndexSettings): Promise<void> {
    const indexObj = this.client.index(index);

    if (settings.searchableAttributes) {
      await indexObj.updateSearchableAttributes(settings.searchableAttributes);
    }

    if (settings.filterableAttributes) {
      await indexObj.updateFilterableAttributes(settings.filterableAttributes);
    }

    if (settings.facetableAttributes) {
      // Note: updateFacetedSearch doesn't exist on Index, skip this step
      // await indexObj.updateFacetedSearch({ facets: settings.facetableAttributes });
    }

    if (settings.sortableAttributes) {
      await indexObj.updateSortableAttributes(settings.sortableAttributes);
    }

    if (settings.rankingRules) {
      await indexObj.updateRankingRules(settings.rankingRules);
    }

    if (settings.synonyms) {
      await indexObj.updateSynonyms(settings.synonyms);
    }

    if (settings.primaryKey) {
      // Primary key cannot be changed after index creation in Meilisearch
      // This is a no-op for existing indices
    }
  }
}

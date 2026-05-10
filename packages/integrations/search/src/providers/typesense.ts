import { logger } from "@nebutra/logger";
import Typesense from "typesense";
import type {
  IndexSettings,
  SearchDocument,
  SearchProvider,
  SearchQuery,
  SearchResult,
  TypesenseConfig,
} from "../types.js";

// =============================================================================
// Typesense Provider — Optimised for geo search and instant faceting
// =============================================================================

export class TypesenseProvider implements SearchProvider {
  readonly name = "typesense";
  private client: unknown;

  constructor(config?: TypesenseConfig) {
    const url = config?.url ?? process.env.TYPESENSE_URL ?? "http://localhost:8108";
    const apiKey = config?.apiKey ?? process.env.TYPESENSE_API_KEY ?? "xyz";
    const timeout = config?.timeout ?? 30000;

    logger.info("[search:typesense] Initializing", { url });

    this.client = new Typesense.Client({
      nodes: [
        {
          host: this._parseHostFromUrl(url),
          port: this._parsePortFromUrl(url),
          protocol: this._parseProtocolFromUrl(url) as "http" | "https",
        },
      ],
      apiKey,
      connectionTimeoutSeconds: timeout / 1000,
    });
  }

  async indexDocument<T extends SearchDocument>(index: string, doc: T): Promise<void> {
    try {
      const collectionName = this._getCollectionName(index, doc.tenantId);
      const document = this._prepareDocument(doc);
      await (this.client as any).collections(collectionName).documents().create(document);
      logger.debug("[search:typesense] Indexed document", {
        collection: collectionName,
        docId: doc.id,
      });
    } catch (error) {
      logger.error("[search:typesense] Failed to index document", {
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
        const collectionName = this._getCollectionName(index, tenantId);
        const documents = tenantDocs.map((doc) => this._prepareDocument(doc));

        for (const doc of documents) {
          await (this.client as any).collections(collectionName).documents().create(doc);
        }

        logger.debug("[search:typesense] Indexed batch", {
          collection: collectionName,
          count: tenantDocs.length,
        });
      }
    } catch (error) {
      logger.error("[search:typesense] Failed to index batch", {
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
      const collectionName = this._getCollectionName(index, query.tenantId);
      const page = query.page ?? 1;
      const hitsPerPage = Math.min(query.hitsPerPage ?? 20, 100);

      // Build filter conditions
      let filterBy: string | undefined;
      if (query.filters || query.tenantId) {
        const filterParts: string[] = [];

        if (query.tenantId) {
          filterParts.push(`tenantId:=${query.tenantId}`);
        }

        if (query.filters) {
          for (const [key, value] of Object.entries(query.filters)) {
            if (typeof value === "string") {
              filterParts.push(`${key}:=${value}`);
            } else if (typeof value === "number") {
              filterParts.push(`${key}:=${value}`);
            } else if (typeof value === "boolean") {
              filterParts.push(`${key}:=${value ? 1 : 0}`);
            }
          }
        }

        if (filterParts.length > 0) {
          filterBy = filterParts.join(" && ");
        }
      }

      const startMs = performance.now();
      const searchParams: any = {
        q: query.query,
        query_by: this._getQueryByFields(),
        page,
        per_page: hitsPerPage,
        typo_tokens_threshold: query.typoTolerance !== false ? 1 : 0,
      };

      if (filterBy) {
        searchParams.filter_by = filterBy;
      }

      if (query.facets) {
        searchParams.facet_by = query.facets.join(",");
      }

      if (query.sort) {
        searchParams.sort_by = query.sort.join(",");
      }

      if (query.highlightFields) {
        searchParams.highlight_fields = query.highlightFields.join(",");
        searchParams.highlight_affix_num_tokens = 5;
      }

      const result = await (this.client as any)
        .collections(collectionName)
        .documents()
        .search(searchParams);
      const processingTimeMs = performance.now() - startMs;

      const hits = (result?.hits || []).map((hit: any) => ({
        doc: hit.document as T,
        score: hit.text_match_info?.score ?? 1,
        highlights: hit.highlight ?? undefined,
      }));

      const totalHits = (result as any)?.found ?? 0;
      const totalPages = Math.ceil(totalHits / hitsPerPage);

      const facetDistribution: Record<string, Record<string, number>> = {};
      const resultAny = result as any;
      if (resultAny?.facet_counts) {
        for (const facet of resultAny.facet_counts) {
          facetDistribution[facet.field_name] = {};
          for (const count of facet.counts) {
            if (count.value !== undefined && count.count !== undefined) {
              const field = facetDistribution[facet.field_name];
              if (field) {
                field[count.value] = count.count;
              }
            }
          }
        }
      }

      logger.debug("[search:typesense] Search completed", {
        collection: collectionName,
        query: query.query,
        hits: hits.length,
        totalHits,
        processingTimeMs,
      });

      return {
        hits,
        totalHits,
        processingTimeMs,
        facetDistribution:
          (Object.keys(facetDistribution).length > 0 ? facetDistribution : undefined) ?? {},
        page,
        hitsPerPage,
        totalPages,
      };
    } catch (error) {
      logger.error("[search:typesense] Search failed", {
        index,
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteDocument(index: string, docId: string, tenantId?: string): Promise<void> {
    try {
      const collectionName = this._getCollectionName(index, tenantId);
      await (this.client as any).collections(collectionName).documents(docId).delete();
      logger.debug("[search:typesense] Deleted document", {
        collection: collectionName,
        docId,
      });
    } catch (error) {
      logger.error("[search:typesense] Failed to delete document", {
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
          filterParts.push(`${key}:=${value}`);
        } else if (typeof value === "number") {
          filterParts.push(`${key}:=${value}`);
        } else if (typeof value === "boolean") {
          filterParts.push(`${key}:=${value ? 1 : 0}`);
        }
      }

      const filterBy = filterParts.join(" && ");

      // Search for matching documents
      const result = await (this.client as any)
        .collections(index)
        .documents()
        .search({ q: "*", filter_by: filterBy, limit: 10000 });

      if ((result as any)?.hits && (result as any).hits.length > 0) {
        for (const hit of (result as any).hits) {
          await (this.client as any).collections(index).documents(hit.document.id).delete();
        }
        logger.debug("[search:typesense] Deleted documents by filter", {
          collection: index,
          filters,
          deletedCount: (result as any).hits.length,
        });
      }
    } catch (error) {
      logger.error("[search:typesense] Failed to delete by filter", {
        index,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createIndex(index: string, settings: IndexSettings): Promise<void> {
    try {
      // Typesense requires explicit schema definition
      const schema = this._buildSchema(index, settings);
      await (this.client as any).collections().create(schema);
      logger.info("[search:typesense] Collection created", { collection: index });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Already exists")) {
        logger.debug("[search:typesense] Collection already exists", { collection: index });
        return;
      }
      logger.error("[search:typesense] Failed to create collection", {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateSettings(index: string, _settings: IndexSettings): Promise<void> {
    try {
      // Typesense doesn't support updating schema after creation
      // Log a warning and skip
      logger.warn("[search:typesense] Schema updates not supported after creation", {
        index,
      });
    } catch (error) {
      logger.error("[search:typesense] Failed to update settings", {
        index,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    logger.info("[search:typesense] Closing connection");
    // Typesense doesn't require explicit connection cleanup
  }

  // ─────────────────────────────────────────────────────────────────────────

  private _getCollectionName(baseIndex: string, tenantId?: string): string {
    if (tenantId) {
      return `${baseIndex}__${tenantId}`;
    }
    return baseIndex;
  }

  private _prepareDocument(doc: SearchDocument): Record<string, unknown> {
    return { ...doc };
  }

  private _buildSchema(collectionName: string, settings: IndexSettings): Record<string, unknown> {
    const fields: any[] = [
      { name: "id", type: "string" },
      { name: "tenantId", type: "string", optional: true },
    ];

    // Add searchable fields
    if (settings.searchableAttributes) {
      for (const attr of settings.searchableAttributes) {
        if (!["id", "tenantId"].includes(attr)) {
          fields.push({ name: attr, type: "string" });
        }
      }
    }

    // Add facetable fields
    if (settings.facetableAttributes) {
      for (const attr of settings.facetableAttributes) {
        if (!fields.some((f) => f.name === attr)) {
          fields.push({ name: attr, type: "string", facet: true });
        }
      }
    }

    return {
      name: collectionName,
      fields,
      default_sorting_field: "id",
    };
  }

  private _getQueryByFields(): string {
    // Default searchable fields
    return "id,tenantId";
  }

  private _parseHostFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "localhost";
    }
  }

  private _parsePortFromUrl(url: string): number {
    try {
      const urlObj = new URL(url);
      if (urlObj.port) {
        return parseInt(urlObj.port, 10);
      }
      return urlObj.protocol === "https:" ? 443 : 80;
    } catch {
      return 8108;
    }
  }

  private _parseProtocolFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol.replace(":", "");
    } catch {
      return "http";
    }
  }
}

import { z } from "zod";

// =============================================================================
// Core Search Abstraction — Provider-agnostic full-text search types
// =============================================================================

/**
 * Supported search backend providers.
 *
 * - `meilisearch` — Self-hosted, developer-friendly, typo-tolerant
 * - `typesense`   — Self-hosted, optimised for geo search and faceting
 * - `algolia`     — Managed SaaS, zero-ops, global CDN
 */
export type SearchProviderType = "meilisearch" | "typesense" | "algolia";

// ── Search Document ────────────────────────────────────────────────────────

/**
 * A document that can be indexed by the search provider.
 * All documents must have an id; tenantId is optional for multi-tenancy.
 * Additional fields are arbitrary and searchable.
 */
export const SearchDocumentSchema = z
  .object({
    /** Globally unique document ID within the index */
    id: z.string(),

    /** Optional tenant/workspace ID for multi-tenant filtering */
    tenantId: z.string().optional(),

    /** Arbitrary searchable fields — flattened at index time */
  })
  .passthrough();

export type SearchDocument = z.infer<typeof SearchDocumentSchema>;

// ── Search Query ──────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  /** Full-text search query string (e.g., "analytics dashboard") */
  query: z.string(),

  /** Tenant ID for filtering results to a specific tenant */
  tenantId: z.string().optional(),

  /** Filters to apply (provider-agnostic key-value pairs) */
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),

  /** Facet fields to include in results (for filtering UI) */
  facets: z.array(z.string()).optional(),

  /** Sort order (e.g., ["createdAt:desc", "relevance:asc"]) */
  sort: z.array(z.string()).optional(),

  /** Page number (1-indexed, default: 1) */
  page: z.number().int().min(1).optional(),

  /** Hits per page (default: 20, max: 100) */
  hitsPerPage: z.number().int().min(1).max(100).optional(),

  /** Fields to return highlights for (where supported) */
  highlightFields: z.array(z.string()).optional(),

  /** Enable typo tolerance (default: true) */
  typoTolerance: z.boolean().optional(),

  /** Minimum score threshold (0-1, provider-dependent interpretation) */
  minScore: z.number().min(0).max(1).optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// ── Search Result ──────────────────────────────────────────────────────────

export interface SearchHit<T extends SearchDocument = SearchDocument> {
  /** The matched document */
  doc: T;

  /** Score (0-1) — higher is more relevant */
  score: number;

  /** Field highlights (HTML-safe snippets with <mark> tags) */
  highlights?: Record<string, string>;
}

export interface SearchResult<T extends SearchDocument = SearchDocument> {
  /** Matching documents with relevance scores */
  hits: SearchHit<T>[];

  /** Total number of matches (before pagination) */
  totalHits: number;

  /** Time taken by the provider (in milliseconds) */
  processingTimeMs: number;

  /** Facet distribution for filter UI (if requested) */
  facetDistribution?: Record<string, Record<string, number>>;

  /** Current page number (1-indexed) */
  page: number;

  /** Hits per page */
  hitsPerPage: number;

  /** Total pages (calculated from totalHits / hitsPerPage) */
  totalPages: number;
}

// ── Search Provider Interface ──────────────────────────────────────────────

/**
 * Every search backend must implement this interface.
 * The factory function (`createSearch`) returns a `SearchProvider`.
 */
export interface SearchProvider {
  readonly name: SearchProviderType;

  /**
   * Index a single document.
   * If the document already exists, it is updated (upsert semantics).
   */
  indexDocument<T extends SearchDocument>(index: string, doc: T): Promise<void>;

  /**
   * Index multiple documents in a batch operation.
   * More efficient than sequential indexDocument() calls.
   */
  indexDocuments<T extends SearchDocument>(index: string, docs: T[]): Promise<void>;

  /**
   * Search for documents matching a query.
   */
  search<T extends SearchDocument = SearchDocument>(
    index: string,
    query: SearchQuery,
  ): Promise<SearchResult<T>>;

  /**
   * Delete a single document from an index.
   */
  deleteDocument(index: string, docId: string, tenantId?: string): Promise<void>;

  /**
   * Delete multiple documents matching a filter.
   * Typically used for tenant cleanup: deleteByFilter(index, { tenantId: "org_123" })
   */
  deleteByFilter(index: string, filters: Record<string, string | number | boolean>): Promise<void>;

  /**
   * Create or update an index with optional settings.
   * Called during app initialization to set up searchable fields.
   */
  createIndex(index: string, settings: IndexSettings): Promise<void>;

  /**
   * Update index settings (e.g., searchable attributes, ranking rules).
   */
  updateSettings(index: string, settings: IndexSettings): Promise<void>;

  /**
   * Graceful shutdown — close connections, flush in-flight operations.
   */
  close(): Promise<void>;
}

// ── Index Settings ────────────────────────────────────────────────────────

export interface IndexSettings {
  /** Attributes that should be searchable (default: all) */
  searchableAttributes?: string[];

  /** Attributes used for filtering */
  filterableAttributes?: string[];

  /** Attributes to use for faceting */
  facetableAttributes?: string[];

  /** Attributes used for sorting */
  sortableAttributes?: string[];

  /** Primary key / unique field (default: "id") */
  primaryKey?: string;

  /** Custom ranking rules (provider-specific) */
  rankingRules?: string[];

  /** Synonyms for the index (e.g., { "dashboard": ["overview", "analytics"] }) */
  synonyms?: Record<string, string[]>;
}

// ── Provider Configurations ────────────────────────────────────────────────

export interface MeilisearchConfig {
  provider: "meilisearch";

  /** Meilisearch server URL (defaults to `process.env.MEILISEARCH_URL`) */
  url?: string;

  /** API key with at least search + indexing permissions (defaults to `process.env.MEILISEARCH_API_KEY`) */
  apiKey?: string;

  /** Default timeout for requests (in milliseconds, default: 30000) */
  timeout?: number;
}

export interface TypesenseConfig {
  provider: "typesense";

  /** Typesense server URL (defaults to `process.env.TYPESENSE_URL`) */
  url?: string;

  /** API key for authentication (defaults to `process.env.TYPESENSE_API_KEY`) */
  apiKey?: string;

  /** Default timeout for requests (in milliseconds, default: 30000) */
  timeout?: number;
}

export interface AlgoliaConfig {
  provider: "algolia";

  /** Algolia app ID (defaults to `process.env.ALGOLIA_APP_ID`) */
  appId?: string;

  /** Algolia search API key (defaults to `process.env.ALGOLIA_SEARCH_KEY`) */
  searchKey?: string;

  /** Algolia admin API key for indexing (defaults to `process.env.ALGOLIA_ADMIN_KEY`) */
  adminKey?: string;
}

export type SearchConfig = MeilisearchConfig | TypesenseConfig | AlgoliaConfig;

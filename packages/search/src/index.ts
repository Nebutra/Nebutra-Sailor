// =============================================================================
// @nebutra/search — Provider-agnostic full-text search
// =============================================================================
// Supports:
//   - Meilisearch        (self-hosted, developer-friendly)
//   - Typesense          (self-hosted, geo + instant faceting)
//   - Algolia            (managed SaaS, zero-ops)
//
// Usage:
//   import { getSearch } from "@nebutra/search";
//
//   const search = await getSearch();  // auto-detects provider
//   await search.indexDocument("products", { id: "123", name: "Widget" });
//   const results = await search.search("products", { query: "widget" });
// =============================================================================

// ── Factory ─────────────────────────────────────────────────────────────────
export { closeSearch, createSearch, getSearch, setSearch } from "./factory.js";

// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { AlgoliaProvider } from "./providers/algolia.js";
export { MeilisearchProvider } from "./providers/meilisearch.js";
export { TypesenseProvider } from "./providers/typesense.js";

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  AlgoliaConfig,
  IndexSettings,
  MeilisearchConfig,
  SearchConfig,
  SearchDocument,
  SearchHit,
  SearchProvider,
  SearchProviderType,
  SearchQuery,
  SearchResult,
  TypesenseConfig,
} from "./types.js";
export { SearchDocumentSchema, SearchQuerySchema } from "./types.js";

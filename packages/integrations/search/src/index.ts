// =============================================================================
// @nebutra/search — Provider-agnostic full-text search
// =============================================================================
// Supports:
//   - pgvector           (Postgres + pgvector extension; BM25 + vector search)
//
// Usage:
//   import { getSearch } from "@nebutra/search";
//
//   const search = await getSearch();  // auto-detects provider
//   await search.indexDocument("products", { id: "123", name: "Widget" });
//   const results = await search.search("products", { query: "widget" });
// =============================================================================

// ── Factory ─────────────────────────────────────────────────────────────────
export { closeSearch, createSearch, getSearch, setSearch } from "./factory";

// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { PgvectorProvider } from "./providers/pgvector";

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  IndexSettings,
  PgvectorConfig,
  SearchConfig,
  SearchDocument,
  SearchHit,
  SearchProvider,
  SearchProviderType,
  SearchQuery,
  SearchResult,
} from "./types";
export { SearchDocumentSchema, SearchQuerySchema } from "./types";

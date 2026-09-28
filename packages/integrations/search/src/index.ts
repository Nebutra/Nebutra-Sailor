// =============================================================================
// @nebutra/search — Provider-agnostic full-text search
// =============================================================================
// Supports:
//   - pgvector           (Postgres + pgvector extension; BM25 + vector search)
//
// The pgvector provider should be given a PgvectorDbAdapter
// (getSystemDb/getTenantDb) via config.db — inside the @nebutra/db-owning
// monorepo that's @nebutra/db's own exports. Omitting db falls back to a
// private pg.Pool from DATABASE_URL (deprecated, logs a one-time warning).
//
// Usage:
//   import { getSystemDb, getTenantDb } from "@nebutra/db";
//   import { createSearch, setSearch, getSearch } from "@nebutra/search";
//
//   setSearch(await createSearch({ provider: "pgvector", db: { getSystemDb, getTenantDb } }));
//   const search = await getSearch();
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
  PgvectorDbAdapter,
  PgvectorSqlClient,
  SearchConfig,
  SearchDocument,
  SearchHit,
  SearchProvider,
  SearchProviderType,
  SearchQuery,
  SearchResult,
} from "./types";
export { SearchDocumentSchema, SearchQuerySchema } from "./types";

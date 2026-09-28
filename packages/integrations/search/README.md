> **Status: Foundation** — Type definitions, factory pattern, and the pgvector provider are complete. See inline TODOs for integration points.

# @nebutra/search

Single-provider full-text + vector search package for Nebutra-Sailor: **pgvector** (Postgres + the `pgvector` extension) — BM25 keyword search and vector cosine search over your own Postgres, with no external search infra to operate.

## Quick Start

### Installation

```bash
pnpm add @nebutra/search
```

### Basic Usage

Inject a `PgvectorDbAdapter` (`getSystemDb` / `getTenantDb`) that reaches
your Postgres — see "Provider Configuration" below for the deprecated
no-`db` fallback. Inside the Nebutra monorepo that's `@nebutra/db`'s own
exports:

```typescript
import { getSystemDb, getTenantDb } from "@nebutra/db";
import { createSearch, setSearch } from "@nebutra/search";

// Once, at startup:
setSearch(
  await createSearch({
    provider: "pgvector",
    db: { getSystemDb, getTenantDb },
  }),
);

// Anywhere after that:
import { getSearch } from "@nebutra/search";
const search = await getSearch();

// Index a document
await search.indexDocument("products", {
  id: "prod_123",
  name: "Widget Pro",
  description: "Professional-grade widget",
  price: 99.99,
  tenantId: "org_456", // Optional: for multi-tenant filtering
});

// Search
const results = await search.search("products", {
  query: "widget",
  tenantId: "org_456", // Only search within this tenant
  hitsPerPage: 20,
  page: 1,
});

// Delete
await search.deleteDocument("products", "prod_123", "org_456");
```

## Provider Configuration

`pgvector` is the only supported provider. Give it `config.db` to inject a
`PgvectorDbAdapter`:

```typescript
interface PgvectorDbAdapter {
  getSystemDb(): PgvectorSqlClient; // untenanted: table/extension bootstrap, system-wide scans
  getTenantDb(tenantId: string): PgvectorSqlClient; // tenant-scoped reads/writes
}
```

`@nebutra/search` is a standalone, publishable package and deliberately does
**not** depend on `@nebutra/db` (the Nebutra monorepo's own database package,
which is private/unpublished — see
`tests/architecture/release-surface.test.ts`). Inside the monorepo, wire
`@nebutra/db`'s own `getSystemDb` / `getTenantDb` as the adapter (see
`backends/gateway/src/routes/search/index.ts`); this way search shares the
one connection pool the rest of the app uses, including the local PGlite
preview database and Hyperdrive routing on Workers.

```typescript
import { createSearch } from "@nebutra/search";

const search = await createSearch({
  provider: "pgvector",
  db: myPgvectorDbAdapter, // strongly preferred
  embeddingDim: 1536, // defaults to 1536 (OpenAI text-embedding-3-small)
  tablePrefix: "nebutra_search", // defaults to "nebutra_search"
});
```

**Deprecated fallback.** Omitting `db` falls back to a `pg.Pool` this
provider opens and owns itself, from `connectionString` or `DATABASE_URL` —
the pre-3.1 behavior, kept for backward compatibility. It logs a one-time
deprecation warning and does not share your app's connection pool, tenant
RLS session, or preview/Hyperdrive routing. It will be removed in a future
major version; migrate to `db`.

```typescript
// Deprecated — logs a one-time warning:
const search = await createSearch({
  provider: "pgvector",
  connectionString: process.env.DATABASE_URL, // or omit to read DATABASE_URL directly
});
```

## API Reference

### `indexDocument(index, doc)`

Index a single document (upsert semantics).

```typescript
await search.indexDocument("products", {
  id: "prod_123",
  name: "Widget",
  tenantId: "org_456",
  category: "tools",
});
```

### `indexDocuments(index, docs)`

Index multiple documents in batch (more efficient).

```typescript
await search.indexDocuments("products", [
  { id: "prod_1", name: "Widget", tenantId: "org_456" },
  { id: "prod_2", name: "Gadget", tenantId: "org_456" },
]);
```

### `search(index, query)`

Search with full-text query and optional filters.

```typescript
const results = await search.search("products", {
  query: "widget pro",
  tenantId: "org_456", // Filter to tenant
  filters: { category: "tools", inStock: true },
  facets: ["category", "brand"],
  sort: ["price:desc"],
  page: 1,
  hitsPerPage: 20,
  highlightFields: ["name", "description"],
});
```

**Returns:**
```typescript
{
  hits: [
    {
      doc: { id: "prod_123", name: "Widget Pro", ... },
      score: 0.95,
      highlights: { name: "<mark>Widget</mark> Pro" }
    }
  ],
  totalHits: 42,
  totalPages: 3,
  page: 1,
  hitsPerPage: 20,
  processingTimeMs: 12,
  facetDistribution: { category: { tools: 25, ... } }
}
```

### `deleteDocument(index, docId, tenantId?)`

Delete a single document.

```typescript
await search.deleteDocument("products", "prod_123", "org_456");
```

### `deleteByFilter(index, filters)`

Delete all documents matching a filter (e.g., for tenant cleanup).

```typescript
// Delete all products from a tenant
await search.deleteByFilter("products", { tenantId: "org_456" });
```

### `createIndex(index, settings)`

Create or configure an index with settings.

```typescript
await search.createIndex("products", {
  searchableAttributes: ["name", "description", "category"],
  filterableAttributes: ["category", "inStock", "tenantId"],
  facetableAttributes: ["category", "brand"],
  sortableAttributes: ["price", "createdAt"],
  rankingRules: ["words", "typo", "proximity", "attribute"],
});
```

### `updateSettings(index, settings)`

Update index settings.

```typescript
await search.updateSettings("products", {
  searchableAttributes: ["name", "description"],
});
```

### `close()`

Gracefully shut down the search provider.

```typescript
await search.close();
```

## Multi-Tenancy

The pgvector provider supports tenant isolation via `tenantId`:

```typescript
// Index with tenant
await search.indexDocument("products", {
  id: "prod_123",
  name: "Widget",
  tenantId: "org_456", // Tenant isolation
});

// Search scoped to tenant
const results = await search.search("products", {
  query: "widget",
  tenantId: "org_456", // Only this tenant's docs
});

// Delete tenant data
await search.deleteByFilter("products", {
  tenantId: "org_456", // Clean up on offboarding
});
```

**Under the hood:** `pgvector` filters by a `tenant_id` column on the shared table for each index (table named `<prefix>_<index>`).

## Direct Provider Import

For advanced use or testing:

```typescript
import { PgvectorProvider } from "@nebutra/search/pgvector";

// Use directly
const search = new PgvectorProvider({ provider: "pgvector" });
```

## Type Safety

All types are exported from the main package:

```typescript
import type {
  SearchDocument,
  SearchQuery,
  SearchResult,
  IndexSettings,
} from "@nebutra/search";
```

## Logging

Uses `@nebutra/logger` for structured logging. All operations log at debug level; errors log at error level.

## Environment Variables

```bash
# Provider selection (optional — pgvector is the only supported provider)
SEARCH_PROVIDER=pgvector

# Only read by the deprecated no-`db` fallback (see "Provider Configuration")
DATABASE_URL=postgres://localhost/nebutra
```

With a `db` adapter injected (preferred), Postgres is reached only through
it — whatever that adapter's own env contract is (for `@nebutra/db`,
`DATABASE_URL`, but resolved by `@nebutra/db`, not by this package).

## Testing

Use the factory to swap providers in tests:

```typescript
import { setSearch } from "@nebutra/search";

const mockSearch = {
  name: "mock",
  async search() { return { hits: [] } },
  // ... other methods
};

setSearch(mockSearch);
```

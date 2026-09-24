> **Status: Foundation** — Type definitions, factory pattern, and the pgvector provider are complete. See inline TODOs for integration points.

# @nebutra/search

Single-provider full-text + vector search package for Nebutra-Sailor: **pgvector** (Postgres + the `pgvector` extension) — BM25 keyword search and vector cosine search over your own Postgres, with no external search infra to operate.

## Quick Start

### Installation

```bash
pnpm add @nebutra/search
```

### Basic Usage

```typescript
import { getSearch } from "@nebutra/search";

// Auto-detects the pgvector provider from DATABASE_URL
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

`pgvector` is the only supported provider. It reads `DATABASE_URL` by default, or accepts an explicit config:

```bash
# .env
DATABASE_URL=postgres://localhost/nebutra
```

```typescript
import { createSearch } from "@nebutra/search";

const search = await createSearch({
  provider: "pgvector",
  connectionString: process.env.DATABASE_URL,
  embeddingDim: 1536, // defaults to 1536 (OpenAI text-embedding-3-small)
  tablePrefix: "nebutra_search", // defaults to "nebutra_search"
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

# pgvector
DATABASE_URL=postgres://localhost/nebutra
```

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

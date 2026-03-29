> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/search

Provider-agnostic full-text search package for Nebutra-Sailor. Supports **Meilisearch**, **Typesense**, and **Algolia** backends with the same API.

## Quick Start

### Installation

```bash
pnpm add @nebutra/search
```

### Basic Usage

```typescript
import { getSearch } from "@nebutra/search";

// Auto-detects provider from environment
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

## Provider Auto-Detection

The factory auto-detects the correct provider based on environment variables:

| Priority | Env Variable | Provider |
|----------|---|---|
| 1 | `SEARCH_PROVIDER` | As specified |
| 2 | `MEILISEARCH_URL` | meilisearch |
| 3 | `TYPESENSE_URL` | typesense |
| 4 | `ALGOLIA_APP_ID` | algolia |
| 5 | — | meilisearch (default) |

### Meilisearch Setup

```bash
# .env
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=your-api-key
```

```typescript
const search = await createSearch({
  provider: "meilisearch",
  url: "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY,
});
```

### Typesense Setup

```bash
# .env
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=your-api-key
```

```typescript
const search = await createSearch({
  provider: "typesense",
  url: "http://localhost:8108",
  apiKey: process.env.TYPESENSE_API_KEY,
});
```

### Algolia Setup

```bash
# .env
ALGOLIA_APP_ID=your-app-id
ALGOLIA_SEARCH_KEY=your-search-key
ALGOLIA_ADMIN_KEY=your-admin-key
```

```typescript
const search = await createSearch({
  provider: "algolia",
  appId: process.env.ALGOLIA_APP_ID,
  searchKey: process.env.ALGOLIA_SEARCH_KEY,
  adminKey: process.env.ALGOLIA_ADMIN_KEY,
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

Update index settings (not supported by all providers after creation).

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

All providers support tenant isolation via `tenantId`:

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

**Under the hood:**
- **Meilisearch** / **Typesense**: Separate indices per tenant (e.g., `products__org_456`)
- **Algolia**: Facet-based filtering within shared indices

## Direct Provider Imports

For advanced use or testing:

```typescript
import { MeilisearchProvider } from "@nebutra/search/meilisearch";
import { TypesenseProvider } from "@nebutra/search/typesense";
import { AlgoliaProvider } from "@nebutra/search/algolia";

// Use directly
const search = new MeilisearchProvider();
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
# Provider selection (optional)
SEARCH_PROVIDER=meilisearch

# Meilisearch
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=xyz

# Typesense
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=xyz

# Algolia
ALGOLIA_APP_ID=xyz
ALGOLIA_SEARCH_KEY=xyz
ALGOLIA_ADMIN_KEY=xyz
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

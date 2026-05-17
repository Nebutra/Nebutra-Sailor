# content-store replication guide

```ts
import { ContentStore } from "@nebutra/content-store";

const store = await ContentStore.open(".nebutra/content", {
  tenantId: "local",
});

await store.write("company/brand.md", "---\nschema: brand_profile\n---\nCyberpunk visual style.");

const hits = await store
  .search()
  .query("cyberpunk visual")
  .filter({ schema: "brand_profile" })
  .topK(5);

const health = await store.doctor();

process.stdout.write(`${JSON.stringify(hits, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
```

## Goal

Keep files as truth and use a rebuildable SQLite index for local search. Frontmatter is part of the query contract; FTS5 handles lexical retrieval and `chunk_vectors` stores local vector embeddings.

## Run it

```bash
pnpm content:doctor
tsx packages/ai/content-store/examples/write-search.ts
pnpm content:query cyberpunk
```

## Files to inspect

- `packages/ai/content-store/src/index.ts`
- `packages/ai/content-store/examples/frontmatter-filter.ts`
- `.nebutra/content/files/local`
- `.nebutra/content/index.sqlite`

## Replication steps

1. Open a tenant-scoped content root.
2. Write a frontmatter-aware file.
3. Reindex if files changed outside the API.
4. Inspect `store.doctor()` to confirm SQLite, FTS, and vector-table status.
5. Query with text and optional schema filters.

## Expected result

The query returns tenant-scoped file hits with path, score, schema, and excerpt.

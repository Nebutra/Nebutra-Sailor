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

process.stdout.write(`${JSON.stringify(hits, null, 2)}\n`);
```

## Goal

Keep files as truth and use a rebuildable index for semantic-style local search. Frontmatter is part of the query contract.

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

## Replication steps

1. Open a tenant-scoped content root.
2. Write a frontmatter-aware file.
3. Reindex if files changed outside the API.
4. Query with text and optional schema filters.

## Expected result

The query returns tenant-scoped file hits with path, score, schema, and excerpt.

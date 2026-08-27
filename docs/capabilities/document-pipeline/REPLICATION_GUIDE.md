# document-pipeline Replication Guide

```ts
import { DocumentPipeline } from "@nebutra/document-pipeline";

const pipeline = await DocumentPipeline.open(".nebutra/document-pipeline", {
  tenantId: "local",
});

const result = await pipeline.ingest({
  tenantId: "local",
  source: {
    type: "inline",
    path: "research/note.md",
    content: "---\nschema: research_note\n---\nretrieval notes",
  },
});

console.log(result);
```

## Steps

1. Open a tenant-scoped pipeline.
2. Parse markdown, HTML, or text natively.
3. Route complex binary formats to the parser sidecar.
4. Preserve metadata while writing into content-store.
5. Query content-store immediately after ingestion.

## Commands

```bash
pnpm docs:doctor
pnpm docs:ingest <path>
pnpm docs:inspect
tsx packages/ai/document-pipeline/examples/ingest-markdown.ts
```

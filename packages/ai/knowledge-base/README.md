# @nebutra/knowledge-base

Status: WIP — product cognition layer over existing retrieval and ingestion
primitives.

`@nebutra/knowledge-base` owns connector sync state, four memory classes,
entity/relation graph records, citations, and explainable tenant-scoped search.
It does not own chunking, embedding, vector storage, parser routing, or model
execution.

## Commands

```bash
pnpm kb:doctor
pnpm kb:debug
pnpm kb:sync <connector>
pnpm kb:stats
pnpm kb:explain <query>
```

## Examples

Executable examples live under `examples/`:

- `ingest-company-context.ts`
- `connector-sync.ts`
- `founder-brief-query.ts`

# @nebutra/knowledge-rag

Multi-tenant **hybrid RAG** pipeline for Nebutra-Sailor.

```
ingest → semantic chunk → embed → vector store + keyword index
       → hybrid retrieval (vector ⊕ keyword) → optional rerank
```

Every persisted record carries a **`tenantId`**. Tenant isolation is enforced
at every store/query boundary — it is never optional. A query scoped to tenant
A can never return tenant B's chunks.

## Status

`active` — exported tool factory (`createKnowledgeRagTool`) is the real caller
(used by `@nebutra/agent-runtime` / `@nebutra/agents`). Zero-config by default.

## Zero-config quick start

No env vars, no external services. In-memory vector store + a deterministic
local hash embedder (real signal — shared tokens raise cosine similarity, not
mocked). The keyword leg auto-activates **only** if a reachable
`@nebutra/search` backend is detected; otherwise it gracefully degrades to
vector-only.

```ts
import { getKnowledgeRag } from "@nebutra/knowledge-rag";

const kb = await getKnowledgeRag();

await kb.ingest({ id: "doc1", tenantId: "org_a", text: "...", meta: { src: "wiki" } });

const hits = await kb.query({ query: "how does X work?", tenantId: "org_a", topK: 5 });
// → RankedChunk[]: { chunk, score, scores: { vector, keyword }, source }

await kb.deleteByDoc("doc1", "org_a"); // tenant-scoped delete
```

## Public API

| Function / method | Purpose |
|---|---|
| `getKnowledgeRag(config?)` | Process-wide instance (or fresh when config given). |
| `createKnowledgeRag(config?)` | Construct an isolated instance. |
| `kb.ingest({ id, text, tenantId, meta? })` | Chunk → embed → index. |
| `kb.query({ query, tenantId, topK? })` | Hybrid retrieval → ranked chunks. |
| `kb.deleteByDoc(docId, tenantId)` | Tenant-scoped removal across both legs. |
| `kb.doctor()` / `doctor(config?)` | Structured health report, **< 3s**. |
| `createKnowledgeRagTool(tenantId, config?)` | Tenant-bound agent tool. |

All thrown errors are `KnowledgeRagError` and carry an actionable
`.suggestion` (and `.code`); `.toJSON()` serialises both for logging.

### Pluggable internals

- **Chunker** — `RecursiveCharChunker({ size, overlap, separators? })`
  (paragraph → line → sentence → word → char), configurable size/overlap.
- **Embedder** — `LocalHashEmbedder` (default, zero-config, no network) or
  `ProviderEmbedder` (wraps `@nebutra/agents` `embedMany()` → Vercel AI SDK
  with the `LLM_EMBEDDING_FALLBACK_CHAIN`).
- **VectorStore** — `InMemoryVectorStore` (default) or `PgvectorStore`
  (interface-only, see below).
- **Reranker** — `IdentityReranker` (default) or `LexicalOverlapReranker`.

## How it wraps existing Sailor infra (no reinvention)

- **Keyword leg → `@nebutra/search`.** `SearchKeywordIndex` wraps the existing
  provider-agnostic search abstraction (`getSearch()` →
  Meilisearch / Typesense / Algolia / pgvector-BM25). Each chunk is indexed as
  a `SearchDocument` carrying `tenantId`; every keyword query passes
  `filters: { tenantId }` and results are re-filtered by tenant, so the keyword
  leg has the same isolation guarantee as the vector leg. `@nebutra/search` is
  imported lazily and a probe call decides reachability — an absent search
  server can never break the zero-config path.
- **Embeddings → `@nebutra/agents`.** `ProviderEmbedder` lazily imports and
  calls `embedMany()` (the SDK's provider/fallback chain). Vector provider
  calls are reused, never reimplemented. With no AI env, the default
  `LocalHashEmbedder` keeps everything running with real (non-mock) results.

## pgvector store (production) — Prisma model + DDL

`PgvectorStore` is interface-only here (not exercised by unit tests, no
migrations run). To activate, apply the schema below and pass an executor.

```prisma
// Add to your Prisma schema. Requires the pgvector extension:
//   model: see below; SQL: CREATE EXTENSION IF NOT EXISTS vector;

/// One persisted RAG chunk. EVERY row is tenant-scoped.
model KnowledgeRagChunk {
  id        String   @id                       // `${docId}::${ordinal}`
  docId     String   @map("doc_id")
  tenantId  String   @map("tenant_id")          // REQUIRED — isolation key
  text      String
  ordinal   Int
  /// Vector column — set the dimension to your embedder's output.
  /// Prisma has no native vector type; declare via Unsupported + raw SQL.
  embedding Unsupported("vector(1536)")
  meta      Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([tenantId])                            // tenant-prefix filtering
  @@index([docId, tenantId])                     // scoped delete
  @@map("knowledge_rag_chunk")
}
```

Companion raw migration (run manually — this package does **not** migrate):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- After `prisma migrate` creates knowledge_rag_chunk, add the ANN index.
-- Cosine distance (<=>) matches the store's similarity = 1 - distance.
CREATE INDEX IF NOT EXISTS knowledge_rag_chunk_embedding_idx
  ON knowledge_rag_chunk
  USING hnsw (embedding vector_cosine_ops);
```

```ts
import { PgvectorStore } from "@nebutra/knowledge-rag";

const store = new PgvectorStore({
  executor: { query: (sql, params) => prisma.$queryRawUnsafe(sql, ...params) },
  embeddingDim: 1536,
});
const kb = await getKnowledgeRag({ vectorStore: store });
```

Every `PgvectorStore` query includes a mandatory `WHERE tenant_id = $1`
predicate; deletes are scoped `WHERE doc_id = $1 AND tenant_id = $2`.

## Examples

Runnable under `examples/` (`node --import tsx examples/<file>.ts`):

1. `01-zero-config.ts` — ingest → query, no config.
2. `02-tenant-isolation.ts` — identical text, zero cross-tenant leakage.
3. `03-custom-pipeline-and-doctor.ts` — custom chunker/reranker + `doctor()`.
4. `04-agent-tool.ts` — tenant-bound agent tool (the real caller).

## Testing

```bash
pnpm --filter @nebutra/knowledge-rag test            # vitest
pnpm --filter @nebutra/knowledge-rag exec vitest run --coverage
```

TDD-first; ≥80% coverage on core logic (chunker boundaries/overlap, hybrid
scoring math, tenant isolation, ingest→query roundtrip).

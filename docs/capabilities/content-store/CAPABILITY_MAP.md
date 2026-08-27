# content-store capability map

## Depends on

None for Layer 0. Embedding can later depend on the gateway, but the file/index contract is independent.

## Decision

PORT. Build Sailor's local-first semantic filesystem grammar: files are truth, the index is rebuildable, and search is frontmatter-aware.

## Three-tier mapping

| Tier | Scope | Sailor landing |
| --- | --- | --- |
| SKIP | Treating SQLite as canonical truth | Not allowed |
| WRAP | Local SQLite, FTS5, and vector-index dependencies | `packages/ai/content-store` |
| PORT | File IO, frontmatter parser, chunking, index rebuild, search builder | `packages/ai/content-store` |

## Public contract

- `ContentStore.open(root, { tenantId })`
- `store.write(path, content)`
- `store.search().query(text).filter(frontmatter).topK(n)`
- `store.doctor()` reports SQLite driver, FTS status, and vector table mode
- Command alias: `pnpm content:query <text>`

## Multi-tenant posture

Tenant content is stored under `files/<tenantId>`. Paths are sanitized and cannot escape the content root.

## Index posture

The SQLite database at `<root>/index.sqlite` is rebuildable. It stores document metadata, frontmatter key/value rows, chunks, an FTS5 table, and a `chunk_vectors` table. When the native vector extension is available, `chunk_vectors` is a `vec0` virtual table; otherwise it stores deterministic local vector blobs and keeps FTS search active.

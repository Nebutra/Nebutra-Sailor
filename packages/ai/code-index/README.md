# @nebutra/code-index

Status: WIP — port contracts and deterministic indexing core are present, but
production adapters are intentionally injected by consumers.

`@nebutra/code-index` owns the provider-agnostic codebase semantic-index
grammar: content-hash chunking, incremental scan, embedding-profile drift
recreate, and cosine retrieval behind `Embedder`, `VectorStore`, and
`CodeParser` ports.

Current gaps:

- Concrete embedder and vector-store adapters are injected, not bundled.
- Structural chunking uses an injected parser port; no native tree-sitter
  dependency is shipped here.
- Production deployment still needs tenant-scoped storage, provider credentials,
  and operational re-indexing policy supplied by the host app.

Use `@nebutra/agents` for model/embedding provider execution and keep this
package focused on indexing contracts and deterministic orchestration.

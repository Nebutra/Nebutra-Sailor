# knowledge-base Anti-Patterns

## Rebuilding Retrieval

Do not add a new chunker, embedder, vector store, or reranker here. Retrieval
belongs to `knowledge-rag`; file truth belongs to `content-store`; parser
routing belongs to `document-pipeline`.

## Connector Secrets In The Agent Loop

Connectors invoke through `integration-vault` or an injected connector port.
The knowledge layer stores source ids, scopes, and citations, not raw tokens.

## Answer Without Citation

Every answer surfaced by this package should carry chunk-level citations. If no
citation exists, return that no tenant-scoped knowledge matched.

## Graph Extraction Blocking Ingestion

Entity/relation extraction is allowed to be lossy and asynchronous. It must not
block basic document ingestion or retrieval.

## Cross-Tenant Metadata Filtering Only

Every API takes a tenant id and every record stores a tenant id. Do not rely on
model prompts or caller discipline for isolation.

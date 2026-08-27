# knowledge-base Capability Map

## Depends On

- content-store
- document-pipeline
- integration-vault
- knowledge-rag
- agent-loop

## Decision Matrix

| Area | Decision | Owner |
| --- | --- | --- |
| File truth and rebuildable index | WRAP | content-store |
| Parser routing and metadata-preserving ingestion | WRAP | document-pipeline |
| Chunking, embedding, vector/keyword retrieval, rerank ports | SKIP / WRAP | knowledge-rag |
| External source invocation and secrets | WRAP | integration-vault |
| Connector schedule, sync state, memory taxonomy, entity graph, citation/explain API | PORT | knowledge-base |

## Boundary

`knowledge-base` is the product cognition layer. It must not define a second
RAG pipeline, local embedder, parser router, or vector store. Its job is to
turn source sync and company memory into tenant-scoped retrieval answers with
traceable citations.

## Current Status

The package ships a zero-config local path for ingestion, memory, graph records,
search, explain, stats, doctor, debug, and connector-port sync. Production
connectors and durable graph tables remain WIP.

---
"@nebutra/tenant-store": minor
"@nebutra/knowledge-rag": minor
"@nebutra/collab": minor
"@nebutra/ui": minor
"@nebutra/reel": patch
"@nebutra/atelier-canvas": patch
"@nebutra/feature-flags": patch
---

Capability absorption — codename `canvas` (clean-room, architecture-translation only).

- **New `@nebutra/tenant-store`** (Step-0 governance): neutral lower layer —
  `withTenantLock` + `InMemoryTenantStore` + `TenantScopedStore`. `reel` and
  `atelier-canvas` now both depend on it and no longer on each other;
  duplicated store mechanics removed. `withCanvasLock`/`_resetCanvasLocks`
  kept as deprecated back-compat aliases.
- **New `@nebutra/knowledge-rag`**: multi-tenant hybrid RAG pipeline
  (recursive chunker, zero-config local + provider embedder, in-memory +
  pgvector stores, vector+keyword hybrid, reranker, `doctor()`, agent tool).
  WRAPs `@nebutra/search` and `@nebutra/agents`.
- **New `@nebutra/collab`**: multi-tenant Yjs CRDT sync layer
  (tenant-partitioned rooms, snapshot via `withTenantLock`, pluggable
  store/transport seams, `doctor()`).
- **`@nebutra/ui`**: new `NodeGraphCanvas` — interactive `@xyflow/react`
  editor bound verbatim to the `@nebutra/reel` model; DS `Button` +
  `@nebutra/icons` + token-themed xyflow.
- **`@nebutra/feature-flags`**: `CANVAS_DEMO` flag (off by default) for the
  `apps/web` `/demo/canvas` route.

Multi-tenant isolation enforced throughout; zero external product source
copied; TDD with all suites green. See `docs/capabilities/canvas/`.

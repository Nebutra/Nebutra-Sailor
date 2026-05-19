# @nebutra/ui

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/brand@0.1.1
  - @nebutra/graph-model@0.2.1
  - @nebutra/icons@0.1.1
  - @nebutra/tokens@0.1.1

## 0.2.0

### Minor Changes

- [`34bd161`](https://github.com/Nebutra/Nebutra-Sailor/commit/34bd16140436c966896bf7a2276e8c20777c256f) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Capability absorption — codename `canvas` (clean-room, architecture-translation only).
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

- [`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Dependency-direction governance: generic UI no longer depends on a feature.
  - **New `@nebutra/graph-model`**: neutral structural DAG contract
    (`GraphNode`/`GraphEdge`/`Graph` + `inboundEdges`/`hasCycleFrom`/
    `wouldCreateCycle`).
  - **`@nebutra/ui` `NodeGraphCanvas` is now generic** over `graph-model`;
    domain bits (`edgeIdentity`, `makeEdge`, `renderNode`) are injected props.
    It no longer depends on `@nebutra/reel`. **Breaking for direct consumers**:
    use `<ReelCanvas>` from the new `@nebutra/reel-canvas` for the reel-bound
    editor.
  - **New `@nebutra/reel/canvas` subpath**: composition layer binding the
    generic editor to reel (depends on `@nebutra/ui` + `@nebutra/reel`).
  - **`@nebutra/reel`**: `ReelNode`/`ReelEdge` now extend the generic types;
    `inboundEdges`/`hasCycleFrom` delegate to graph-model with unchanged
    signatures — public contract preserved (25/25 reel tests green).

  Dependency direction is now always specific → generic. See
  `docs/capabilities/canvas/ANTI_PATTERNS.md` §7.

### Patch Changes

- Updated dependencies [[`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b)]:
  - @nebutra/graph-model@0.2.0

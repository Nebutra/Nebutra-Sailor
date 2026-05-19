# @nebutra/reel

## 1.0.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/agents@1.1.1
  - @nebutra/graph-model@0.2.1
  - @nebutra/icons@0.1.1
  - @nebutra/logger@0.1.1
  - @nebutra/tenant-store@0.2.1
  - @nebutra/ui@0.2.1

## 1.0.0

### Minor Changes

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

- [`4f5687f`](https://github.com/Nebutra/Nebutra-Sailor/commit/4f5687fd3fc55529486d6356e010bcaeffe131c8) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add the Reel node-graph + storyboard generative-media capability.
  - `@nebutra/reel`: new package — a typed node+edge graph with the absorbed
    **NODE_IO_ENVELOPE v1.0** contract kept exactly (versioned, type-erased
    inter-node payload), pull-based input resolution, cycle detection, and a
    tenant-scoped `ReelGraphStore`. Sibling of `@nebutra/atelier-canvas`
    (free placement) — reuses its `withCanvasLock` + persist-then-broadcast
    primitives, not its schema.
  - `@nebutra/reel/transport`: unified http-json / http-sse / ws-stream
    executor + per-model capability schema + pre-flight contract validator,
    server-side and dependency-injected.
  - `@nebutra/reel/storyboard`: script/novel/custom + table-summary split
    prompts (re-expressed; output contract preserved), numeric-tolerant shot
    identity, the result-routing scheme, and the output-history ring; split
    decoupled via an injected completion fn.
  - `@nebutra/feature-flags`: new `FLAGS.REEL_STUDIO` (off by default).

  A flag-gated `/reel` demo route in `apps/web` exercises script → shots →
  typed node graph end-to-end with the mock provider (no AI key required).

### Patch Changes

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

- Updated dependencies [[`092a1ce`](https://github.com/Nebutra/Nebutra-Sailor/commit/092a1ce810965e2d81767642e4bad05b80df81f4), [`34bd161`](https://github.com/Nebutra/Nebutra-Sailor/commit/34bd16140436c966896bf7a2276e8c20777c256f), [`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704), [`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b)]:
  - @nebutra/agents@1.1.0
  - @nebutra/tenant-store@0.2.0
  - @nebutra/ui@0.2.0
  - @nebutra/graph-model@0.2.0

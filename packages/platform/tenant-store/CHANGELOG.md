# @nebutra/tenant-store

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

### Patch Changes

- [`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Cross-cutting governance extractions (audit-driven SSoT close-out).

  - **New `@nebutra/provider-factory`**: the identical `explicit → env →
detect-chain → fallback` provider selection + production guard that ~10
    packages hand-rolled. `@nebutra/queue` migrated as the proof consumer
    (behaviour + exact error message preserved). Remaining factories migrate
    incrementally on next touch.
  - **New `@nebutra/capability-kit`**: shared `CapabilityError`
    (code+suggestion+toJSON, subclass-safe), `DoctorReportBase`/`DoctorCheck`
    contract, and the `doctor`/`debug` CLI runner that ~9 `src/cli.ts` files
    copied. `@nebutra/collab` migrated as the proof consumer — `CollabError`
    now extends `CapabilityError`, `DoctorReport` extends the shared base, the
    CLI uses the shared runner; output + 14/14 tests unchanged.
  - **`@nebutra/tenant-store`**: `InMemoryTenantStore` gained `delete`/`size`;
    `@nebutra/knowledge-rag` `InMemoryVectorStore` now composes it instead of a
    private tenant-partition Map (consistency-debt close-out for the canvas
    governance). collab's live-`Room` registry deliberately NOT migrated
    (object pool, not a record store — rationale in
    docs/capabilities/canvas/ANTI_PATTERNS.md §8).

  All public contracts preserved; every migrated package's suite stays green.

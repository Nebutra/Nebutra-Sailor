# @nebutra/atelier-canvas

## 1.0.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/agents@1.1.1
  - @nebutra/logger@0.1.1
  - @nebutra/tenant-store@0.2.1

## 1.0.0

### Minor Changes

- [`092a1ce`](https://github.com/Nebutra/Nebutra-Sailor/commit/092a1ce810965e2d81767642e4bad05b80df81f4) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add the Atelier agentic creative-canvas capability.
  - `@nebutra/agents`: new image/video **generation modality**
    (`@nebutra/agents/generation`) on the same env-key-gated provider layer as
    the LLM fallback chain, with a deterministic always-available mock provider.
  - `@nebutra/atelier-canvas`: new package — server-authoritative non-overlap
    placement, persist-then-broadcast consistency, per-`(tenant,canvas)`
    serialization, tenant-scoped store (in-memory + Prisma adapter). The
    `./agent` subpath adds the creative-direction prompt strategy + generation
    tool + `AgentConfig` factory (optional `@nebutra/agents` peer).
  - `@nebutra/feature-flags`: new `FLAGS.ATELIER_CANVAS` (off by default).

  Additive `AtelierCanvas` Prisma model. A flag-gated `/atelier` demo route in
  `apps/web` exercises the loop end-to-end with the mock provider (no AI key
  required).

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

- Updated dependencies [[`092a1ce`](https://github.com/Nebutra/Nebutra-Sailor/commit/092a1ce810965e2d81767642e4bad05b80df81f4), [`34bd161`](https://github.com/Nebutra/Nebutra-Sailor/commit/34bd16140436c966896bf7a2276e8c20777c256f), [`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704)]:
  - @nebutra/agents@1.1.0
  - @nebutra/tenant-store@0.2.0

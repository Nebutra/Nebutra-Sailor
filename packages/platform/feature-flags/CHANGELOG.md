# @nebutra/feature-flags

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @nebutra/cache@0.0.2
  - @nebutra/db@0.1.1

## 0.1.1

### Patch Changes

- [`da6bfea`](https://github.com/Nebutra/Nebutra-Sailor/commit/da6bfeaf6c323a9aecefdd65c481a9852aee25b9) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add `@nebutra/agent-runtime`: a multi-tenant agent-runtime grammar.
  - New package re-expresses a coding-agent runtime _design_ in Sailor grammar —
    thread/turn/item model + event lifecycle, two-axis approval/capability
    policy, uniform tool/MCP abstraction, event-sourced rollout with compaction,
    and an external-sandbox delegation seam.
  - Every serialization scope, store key, and dispatch is tenant-scoped;
    cross-tenant requests can never share a serial lane.
  - No infra change and no in-process untrusted-code execution: the default
    executor fails closed; real execution is delegated behind `ExternalSandbox`.
  - Adds an off-by-default `agent-runtime-demo` feature flag gating a demo route
    in `apps/web`.

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

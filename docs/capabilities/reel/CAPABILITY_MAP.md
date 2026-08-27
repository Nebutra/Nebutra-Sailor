# Reel — Capability Map

**Product form absorbed:** a node-graph + storyboard generative-media
production studio (a 39.8k-line single-file React monolith + a single-user
Python receiver). Everything in the source assumes single-user, browser-local,
no-auth state.

**Decisive context:** a prior absorption (`atelier`) already gave Sailor a
*free-placement* canvas + a generation modality. This product is a *typed
node+edge DAG* — a different data model from atelier's flat `elements[]`
scene. So `reel` is a **sibling** of `@nebutra/atelier-canvas` that reuses its
persistence/consistency primitives (`withCanvasLock`, persist-then-broadcast,
the `*Store` shape), **not** an extension of it.

Legend: **SKIP** = Sailor already covers it; **WRAP** = Sailor has the
primitive, add a thin domain wrapper; **PORT** = differentiated, rebuilt the
capability (not the code) on Sailor primitives, multi-tenant from line one.

| # | Source capability | Verdict | Sailor target / what was done |
|---|---|---|---|
| 1 | Multi-tenancy | **SKIP** | `@nebutra/tenant`. Source had none — used as the redesign anchor; every store method is `tenantId`-scoped. |
| 2 | Auth | **SKIP** | `@nebutra/auth` (`getAuth`/`getTenantContext`). |
| 3 | Generation (image/video) | **SKIP** | `@nebutra/agents/generation` — reused directly (mock terminal, no key needed). |
| 4 | Job queue | **SKIP** | `@nebutra/queue` (for async/long renders; not needed by the mock slice). |
| 5 | Object storage | **SKIP** | `@nebutra/uploads` replaces the source's client IndexedDB Blob persistence. |
| 6 | Realtime | **SKIP** | `workflows/pusher` `broadcastToTenant` — same WRAP seam as atelier's `onPlaced`. |
| 7 | Feature flags + web route/flag pattern | **SKIP** | `@nebutra/feature-flags` + the atelier route+flag+API skeleton, cloned. |
| 8 | Persistence / consistency / per-resource lock | **SKIP/WRAP** | Reused `@nebutra/atelier-canvas` `withCanvasLock` + persist-then-broadcast instead of re-inventing them. |
| 9 | Canvas pan/zoom, undo stack, localStorage | **SKIP/discard** | Commodity React/canvas glue. |
| 10 | Python receiver (file save, CORS proxy) | **SKIP/discard** | Obsolete in a hosted multi-tenant monorepo. |
| 11 | First/last-frame var resolution | **WRAP** | Model-aware; belongs behind the generation provider config (deferred). |
| 12 | Batch capability-probe + fallback | **WRAP** | Layer over the generation modality (deferred). |
| 13 | **NODE_IO_ENVELOPE v1.0** | **PORT** | The one real reusable contract — a versioned, type-erased inter-node payload. Kept exactly (same version string, same validity rules) as `@nebutra/reel` core: typed graph, pull-based input resolution, cycle detection, tenant-scoped store. |
| 14 | **Transport/capability/contract layer** | **PORT** | `@nebutra/reel/transport` — http-json / http-sse / ws-stream unified, per-model `CapabilitySchema`, a pre-flight contract validator. Re-expressed server-side + dependency-injected (no browser globals). |
| 15 | **Storyboard pipeline** | **PORT** | `@nebutra/reel/storyboard` — script/novel/custom + table-summary split prompts (re-expressed, output contract kept), `isSameShotId` numeric-tolerant identity, the `storyboard[-img]-{node}-shot-{shot}` result-routing scheme, the 20-entry output-history ring. Split decoupled via an injected completion fn. |
| 16 | **Multi-key rotation + error-taxonomy blacklist** | **PORT — deferred** | Valuable error taxonomy (1006/credits, 401/402/403, suspend-60m, circuit breaker) but the source impl is client-side localStorage random. Rebuild as a tenant-aware shared key pool (Redis/DB) in a follow-up — out of the vertical slice. |
| 17 | Declarative async-poll + request-chain templating | **PORT — deferred** | A mini-LiteLLM-with-UI. Worth a tenant-scoped server-side rebuild; deferred from the slice. |
| 18 | "DAG executor" | **n/a** | There is none — the source is pull-based reactive. No scheduler to port; resolution is a pure function in `@nebutra/reel`. |

## Net new surface

- `@nebutra/reel` — typed node/edge graph, NODE_IO_ENVELOPE v1.0, pull-based
  resolution, tenant-scoped `ReelGraphStore`.
- `@nebutra/reel/transport` — multi-transport executor + capability/contract.
- `@nebutra/reel/storyboard` — split prompts + shot identity/routing/history.
- `FLAGS.REEL_STUDIO` + `apps/web` `/reel` route (off by default) + `/api/reel/run`.

## Deliberately deferred (documented, not built)

- Multi-key resilience pool (tenant-aware, Redis/DB-backed).
- Declarative async-poll / request-chain templating (server-side, tenant-scoped).
- Real provider/`complete` injection (swap the demo splitter for
  `@nebutra/agents` generateText; swap mock generation for a real provider).
- Prisma persistence (swap `InMemoryReelGraphStore` for a Prisma adapter).
- Pusher realtime broadcast of node outputs.
- First/last-frame resolution, batch capability probe, ComfyUI-envelope adapter.

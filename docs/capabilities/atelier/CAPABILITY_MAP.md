# Atelier — Capability Map

**Product form absorbed:** an agentic creative canvas — an infinite canvas plus
a chat agent that plans, generates images/video, and places the results on the
canvas; assets are server-placed, persisted, and synced.

The source was a single-user desktop app (Electron + Python/LangGraph + SQLite).
Its real differentiated value is narrow: (1) server-authoritative placement +
consistency, (2) a curated multi-provider generation catalog, (3) the
creative-direction prompt engineering. Everything else is commodity orchestration
and single-user glue that Sailor's infrastructure already replaces.

Decision legend:

- **SKIP** — Sailor already covers it; do not rebuild. Used as a redesign anchor.
- **WRAP** — Sailor has the primitive; add a thin domain wrapper, don't reimplement.
- **PORT** — genuinely differentiated; rebuilt the *capability* (not the code) on
  Sailor primitives, multi-tenant from the first line.

| # | Source capability | Verdict | Sailor target / what was done |
|---|---|---|---|
| 1 | Multi-tenancy | **SKIP** | `@nebutra/tenant`. Source had none — used as the redesign anchor; every store method is `tenantId`-scoped. |
| 2 | Auth | **SKIP** | `@nebutra/auth` (`getAuth` / `getTenantContext` in app). |
| 3 | Long-running job queue | **SKIP** | `@nebutra/queue` (not needed by the mock-provider slice; documented as the production wiring for slow renders). |
| 4 | Persistence | **SKIP** the SQLite blob layer | `@nebutra/db` (`getTenantDb`, RLS). Added an additive `AtelierCanvas` Prisma model: one JSON scene blob + `organization_id`, replacing the implicit single user. |
| 5 | Web route + gating | **SKIP** | `apps/web` route-group + `@nebutra/feature-flags` (`FLAGS.ATELIER_CANVAS`, off by default). |
| 6 | Provider registration / env-key gating | **WRAP** | `@nebutra/agents` `fallback.ts` already env-key-gates a provider chain. Reused it — did **not** port the source's parallel provider framework. |
| 7 | Agent orchestration loop | **WRAP** | `@nebutra/agents` `BaseAgent` tool-loop. The source's 2-node LangGraph swarm was orchestration overhead; collapsed to one `AgentConfig` + one tool. |
| 8 | Realtime → canvas | **WRAP** | `workflows/pusher` (`broadcastToTenant`). The engine persists before returning a patch; `onPlaced` is the broadcast seam so the package takes no realtime dependency. The demo returns the patch in the response; production swaps in pusher without touching the engine. |
| 9 | Knowledge base | **WRAP** (deferred) | `@nebutra/search` pgvector + `@nebutra/agents` `embed`. Out of the vertical slice; the source's was a settings passthrough, not RAG. |
| 10 | MCP | **WRAP** (skipped) | `@nebutra/mcp`. The source's MCP path was vestigial/dead; nothing to absorb. |
| 11 | **Image/video generation modality** | **PORT** | **GAP in Sailor.** Added a generation modality *inside* `@nebutra/agents` (`@nebutra/agents/generation`): provider interface, env-key-gated chain mirroring the LLM fallback, deterministic always-available mock terminal. Sailor's provider layer was extended — the external framework was not imported. |
| 12 | **Server-authoritative canvas engine** | **PORT** | **GAP in Sailor.** New `@nebutra/atelier-canvas`: deterministic non-overlap placement, persist-then-broadcast consistency, per-`(tenant,canvas)` serialization, tenant-scoped store (in-memory + Prisma adapter). |
| 13 | **Creative-direction prompt IP + tool** | **PORT** | The planner→creator two-phase prompt, exact-quantity contract, bounded batches, reference-image parsing — re-expressed (not brand-copied) as `@nebutra/atelier-canvas/agent`: one prompt + one tool + an `AgentConfig` factory. Lives under a subpath, **not** a package parallel to `@nebutra/agents`. |

## Net new surface

- `@nebutra/agents/generation` — image/video modality (env-key-gated, mock terminal).
- `@nebutra/atelier-canvas` — placement + consistency + tenant-scoped persistence.
- `@nebutra/atelier-canvas/agent` — prompt strategy + generation tool + agent config (optional `@nebutra/agents` peer).
- `FLAGS.ATELIER_CANVAS` + `apps/web` `/atelier` route (off by default) + `/api/atelier/generate`.

## Deliberately deferred (documented, not built)

- Real generation providers (Replicate / OpenAI images / etc.) — additive: register
  with a non-null `envKey`; mock auto-demotes. No engine change.
- Pusher realtime — wire `onPlaced` → `broadcastToTenant`; client applies from channel.
- Prisma persistence in the app — swap `InMemoryCanvasStore` for `PrismaCanvasStore`.
- Knowledge/RAG, ComfyUI dynamic workflows, video codec output.

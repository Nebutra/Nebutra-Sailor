# Capability Map — `canvas`

> Codename: **`canvas`** · Kind: **product** (clean-room, architecture-translation only) ·
> `depends_on`: **`agent-runtime`**, **`reel`/`atelier-canvas`** (via the shared
> `@nebutra/tenant-store` lower layer)

Absorption of an AI-native creation-engine product form (free-form node canvas +
knowledge RAG + real-time collab). Reference was read for *understanding only*;
**zero source was copied** — every line is a Sailor-native re-expression. The
source's commercial-use + appearance-patent terms were cleared by clean-room
re-expression in Sailor's own design system (see `ANTI_PATTERNS.md`).

## Three-tier decision matrix

| # | Capability | Decision | Where it lives in Sailor |
|---|---|---|---|
| 1 | Node/edge/DAG + IO-envelope data model | **SKIP** | already `@nebutra/reel` (`ReelNode/ReelEdge/ReelGraph`, `NODE_IO_ENVELOPE` v1.0, `hasCycleFrom`) — not duplicated |
| 2 | Interactive infinite canvas editor UI | **PORT** | `@nebutra/ui` → `NodeGraphCanvas` (`@xyflow/react`, bound verbatim to the reel model) |
| 3 | Vibe-mode NL→workflow compilation | **WRAP** | skill on `@nebutra/agent-runtime` emitting a reel graph (not rebuilt) |
| 4 | Intervenable runtime (mid-run steering/audit) | **SKIP** | `@nebutra/agent-runtime` policy/approval/hooks/event-sourced rollout |
| 5 | Multi-vendor LLM + fallback + token metering | **SKIP** | `@nebutra/agents` + provider-registry |
| 6 | Hybrid RAG (chunk + vector + keyword + rerank) | **PORT** | `@nebutra/knowledge-rag` (WRAPs `@nebutra/search` + `@nebutra/agents` embeddings) |
| 7 | Real-time collaborative CRDT | **PORT** | `@nebutra/collab` (Yjs, multi-tenant, on `@nebutra/tenant-store`) |
| 8 | Code-artifact execution sandbox | **WRAP** | `@nebutra/agent-runtime` external-sandbox seam |
| 9 | Skill export (API / MCP / Claude Code) | **SKIP/WRAP** | `@nebutra/agent-runtime` definitions + MCP bridge |
| 10 | Scheduled triggers (cron) | **SKIP** | `@nebutra/queue` + inngest + n8n |
| 11 | MCP server integration + dynamic tool registry | **SKIP/WRAP** | `@nebutra/agent-runtime` MCP bridge + tool registry |

**Net PORT surface: 3 blocks** (#2, #6, #7). The remaining 8 were already
≥80 % covered by `agent-runtime` / existing packages — building them would have
violated the SSoT anti-pattern.

## Governance prerequisite (Step 0, landed first)

`@nebutra/tenant-store` (`packages/platform`) was extracted as a neutral lower
layer (`withTenantLock`, `InMemoryTenantStore`, `TenantScopedStore`). `reel`
dropped its `@nebutra/atelier-canvas` dependency; both now sit on the shared
contract. Duplicated store mechanics removed. `withCanvasLock` kept as a
deprecated back-compat alias.

## Delivered packages

| Package | Tests | Coverage |
|---|---|---|
| `@nebutra/tenant-store` | 10/10 | core |
| `@nebutra/graph-model` | 10/10 | core |
| `@nebutra/knowledge-rag` | 61/61 | 94 %+ |
| `@nebutra/ui` `NodeGraphCanvas` (generic) | 9/9 | adapter 100 % |
| `@nebutra/reel-canvas` (reel binding) | 8/8 | binding |
| `@nebutra/collab` | 14/14 | 92 %+ |

Dependency direction (governance): `@nebutra/ui` (generic) →
`@nebutra/graph-model`; `@nebutra/reel` → `@nebutra/graph-model`;
`@nebutra/reel-canvas` → (`@nebutra/ui`, `@nebutra/reel`). No generic
package depends on a feature package; `reel`↔`atelier-canvas` share only
`@nebutra/tenant-store`. See `ANTI_PATTERNS.md` §6/§7.

Demo: `apps/web` `/[locale]/demo/canvas` — flag `FLAGS.CANVAS_DEMO`, off by default.

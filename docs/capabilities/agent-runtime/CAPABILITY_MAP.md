# agent-runtime — Capability Map (P2, draft pending maintainer sign-off)

> Codename: `agent-runtime`. Governance mainline: **dual-track decoupling**.
> Track A = Sailor TS multi-tenant web (this repo). Track B = **Carina**
> (`Nebutra/carina`) local-first kernel — upstream, self-deployed, docked via
> public JSON-RPC catalog (not a second kernel in this monorepo).
> Source identity is conversation-only; nothing here leaks a brand.
> ADR: `docs/architecture/2026-08-03-carina-track-b-upstream.md`.

## Decision legend

- **SKIP** — Sailor already has an equivalent. Reuse, do not rebuild.
- **WRAP** — Sailor has the primitive; add a domain module that calls it.
- **PORT** — genuinely differentiated/absent; re-express in Sailor grammar
  (multi-tenant TS), three-level staging isolation before landing.

---

## Track A — what lands in this repo

| # | Capability (source subsystem) | Verdict | Sailor anchor (reuse) | Action |
|---|---|---|---|---|
| 1 | Multi-tenancy | **SKIP** | `@nebutra/tenant` (`runWithTenant`, `withRls`) | thread tenant ctx through; nothing built |
| 2 | DB / pgvector infra | **SKIP** | `@nebutra/db` (`getTenantDb`), pgvector ready | back trace/state on this |
| 3 | Gateway host | **SKIP** | `backends/gateway` `routes/agents` | extend existing route, no new service |
| 4 | LLM provider / routing / fallback / telemetry | **SKIP** | `@nebutra/agents` (`runWithFallback`, `configure`, `VercelAIAgent`, Langfuse) | reuse; do not re-port model-provider crate |
| 5 | App-server protocol (`app-server-protocol`, transport) | **WRAP** | new `@nebutra/agent-runtime` | re-express JSON-RPC method registry + **serialization-scope → tenant/thread scope** + server-initiated approval RPC + event-stream notifications over WS/SSE |
| 6 | Thread / Turn / Item model + event lifecycle | **WRAP** | `@nebutra/agent-runtime` | discriminated-union item taxonomy, `started/updated/completed/failed` SM, per-turn config snapshot+override |
| 7 | Rollout / session trace (event-sourced) | **WRAP** | `@nebutra/audit` providers + `@nebutra/db` | append-only typed log + replay-to-state + first-class **compaction marker** + per-item durability/sanitization policy; tenant-scoped table (not jsonl) |
| 8 | Approval & sandbox **policy** layer | **WRAP** | `@nebutra/permissions` (CASL/OpenFGA) | two-axis model (approval tier × capability policy), `Decision`/`ReviewDecision` enums, execpolicy-as-data, declarative writable-roots. Policy only — enforcement is the boundary |
| 9 | Tool / MCP abstraction | **WRAP** | `@nebutra/mcp` (WIP, `mcpClient`, `serverRegistry`, middleware) | activate; `ToolDefinition` + Responses-API tool union + deferred discovery; registry→router→orchestrator w/ hooks; MCP-as-adapter behind uniform tool iface |
| 10 | Durable / resumable turn | **WRAP** | `@nebutra/queue` (`defineQueueJob`) | durable-turn job + state store on top of replay model |
| 11 | **Sandboxed untrusted-code execution** | **PORT (seam) + WRAP (Carina)** | Carina upstream + `createCarinaSandbox` | Seam + fail-closed in Sailor; enforcement in Carina. Phase 1 docked (#382); product wire #384 |

### Build status (honest ledger)

- **Done (built + tested):** #5 contract types, #6 model, #7 rollout
  model+replay (in-mem ref store only), #8 policy, #9 tool/MCP abstraction
  (interface; not yet wired to live `@nebutra/mcp`), #11 **seam** + fail-closed
  default, **plus the agent loop runner** (`runTurn` — model→tool→approval→
  rollout, bounded, single-threaded, resumable by replay).
- **Done (built + tested, runtime closure):** #10 durable/resumable turn
  (`createDurableTurn`), protocol dispatcher (`ProtocolDispatcher`,
  per-scope serialization — WS/SSE socket adapter still out of scope), MCP
  activation (`activateMcpTools` via injectable catalog port), production
  tenant-scoped rollout store (`PersistentRolloutStore` via injectable
  persistence port).
- **Done (live wiring):** gateway route `POST /api/v1/agent-runtime/turns`
  — tenant-scoped `runTurn` streamed over SSE, behind `requireAuth` +
  off-by-default `agent-runtime-demo` flag; `ModelInvoker` bridges
  `@nebutra/agents`.
- **Done (adapters + durable store):** `@nebutra/agent-runtime/adapters/*`
  (`mcp-catalog`, `dispatcher-sse`, `prisma-rollout`); `AgentRolloutLine`
  Prisma model + ADR 2026-05-19; gateway store env-gated
  (`AGENT_ROLLOUT_DURABLE=1` → Postgres, default in-memory).
- **Done (Track B Phase 1 — catalog dock):** `createCarinaSandbox` maps to
  Carina v0.8.1 JSON-RPC (`gateway.hello` + `command.exec`); package tests;
  ADR 2026-08-03; PR #382. Default remains `REFUSING_SANDBOX` when no endpoint.
- **Not yet built (Track B Phase 2 — #384):** gateway inject of
  `CARINA_JSONRPC_URL`, host `session.create`, command-exec tool registration,
  optional approval bridge (`task.action.approve` / `deny`).
- **Not deeply mapped:** model catalog manager, apply-patch grammar,
  compaction *generation* logic, tool_search discovery *mechanism*, hooks
  pipeline impl, web_search/image-gen handlers.

## Track B — Carina upstream (`Nebutra/carina`)

**Decision (2026-08-03):** Track B is **not** `backends/rust/sandbox/` and is
**not** a Sailor-owned second kernel. Isolation, capability enforcement, OS
backends, and audit chain live in **Carina** (separate repo, local-first,
self-deployed). Sailor only ships a thin adapter over Carina's public catalog.

| Piece | Location | Notes |
|-------|----------|--------|
| Kernel / daemon | `Nebutra/carina` | Upstream; operator self-deploys |
| Public catalog | Carina `protocol/jsonrpc/methods.json` | v0.8.1+; no product-adapter package (Carina #27 not planned) |
| Sailor adapter | `packages/ai/agent-runtime/src/sandbox.ts` → `createCarinaSandbox` | HTTP JSON-RPC; pin `CARINA_MIN_PROTOCOL_VERSION` |
| Generic HTTP helper | `createHttpSandbox` | Tests / non-Carina isolators only; prefer Carina for product Track B |
| Fail-closed default | `REFUSING_SANDBOX` | No endpoint → no untrusted exec |
| Product wire | Gateway / host | [#384](https://github.com/Nebutra/Nebutra-Sailor/issues/384) |

Historical note: earlier drafts pointed at a same-repo Rust isolator and
`POST /api/v1/sandbox/exec`. That path is **superseded** by Carina docking.
Do not revive a parallel Sailor sandbox service for product Track B.

---

## The one governance fork (item #11)

Untrusted exec never runs in the multi-tenant web process. Track A holds
**policy + delegation seam** only; Track B enforcement is **Carina**. Phase 1
adapter is closed (#382); Phase 2 product wire is #384. Everything else in the
SKIP/WRAP table is absorber execution detail.

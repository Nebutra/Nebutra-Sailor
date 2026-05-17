# agent-runtime — Capability Map (P2, draft pending maintainer sign-off)

> Codename: `agent-runtime`. Governance mainline: **dual-track decoupling**.
> Track A = Sailor TS multi-tenant web (this repo). Track B = optional self-hosted
> kernel sidecar, protocol-decoupled (not in this repo).
> Source identity is conversation-only; nothing here leaks a brand.

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
| 11 | **Sandboxed untrusted-code execution** | **PORT** | *nothing exists* | the only true greenfield piece — see governance fork below |

### Build status (honest ledger)

- **Done (built + tested):** #5 contract types, #6 model, #7 rollout
  model+replay (in-mem ref store only), #8 policy, #9 tool/MCP abstraction
  (interface; not yet wired to live `@nebutra/mcp`), #11 seam + Rust
  fail-closed isolator, **plus the agent loop runner** (`runTurn` — the turn
  engine: model→tool→approval→rollout, bounded, single-threaded, resumable
  by replay).
- **Done (built + tested, runtime closure):** #10 durable/resumable turn
  (`createDurableTurn`), protocol dispatcher (`ProtocolDispatcher`,
  per-scope serialization — WS/SSE socket adapter still out of scope), MCP
  activation (`activateMcpTools` via injectable catalog port), production
  tenant-scoped rollout store (`PersistentRolloutStore` via injectable
  persistence port). 59 package tests green.
- **Done (live wiring):** gateway route `POST /api/v1/agent-runtime/turns`
  — tenant-scoped `runTurn` streamed over SSE, behind `requireAuth` +
  off-by-default `agent-runtime-demo` flag; `ModelInvoker` bridges
  `@nebutra/agents`. Gateway typecheck clean.
- **Done (adapters + durable store):** `@nebutra/agent-runtime-adapters`
  (`mcp-catalog`, `dispatcher-sse`, `prisma-rollout` — 26 tests);
  `AgentRolloutLine` Prisma model + additive migration
  `20260519000000_add_agent_rollout_store` + ADR 2026-05-19; gateway route
  store is env-gated (`AGENT_ROLLOUT_DURABLE=1` → durable Postgres
  system-of-record, default in-memory). Gateway typecheck clean.
- **Not yet built:** real isolation backend (Wasmtime/Firecracker Phase 2);
  a command-exec tool (sandbox delegation activates the moment one is
  registered). Durable-store activation = standard migrate+generate deploy
  step (ADR 2026-05-19), not code change — intentionally not faked.
- **Not deeply mapped:** model catalog manager, apply-patch grammar,
  compaction *generation* logic, tool_search discovery *mechanism*, hooks
  pipeline impl, web_search/image-gen handlers.

## Track B — decoupled, in `backends/rust/sandbox/`

Correction to an earlier overstatement: Track B is **not** a separate repo.
`backends/` is Sailor's documented polyglot split (`backends/README.md`:
"Rust | Safety-critical isolation … | `rust/sandbox/`", decision rule
"Touches user code execution or encryption? → Rust"). The TS-by-default ADR
explicitly carves out specialized cases. So the Track-B isolator lives at
`backends/rust/sandbox/` — same repo, protocol-decoupled, no new ADR needed,
no app-infra touched (it is an isolated service like `backends/python/ai`).

Decoupling = the protocol/HTTP contract, **not** a repo boundary. Track A
delegates over `POST /api/v1/sandbox/exec` via `createHttpSandbox()` in
`agent-runtime/sandbox.ts`; the Rust service mirrors the
`SandboxExecRequest`/`SandboxExecResult`/`CapabilityPolicy` shapes.

The isolator is **fail-closed**: until a real backend (Wasmtime Phase 2 /
Firecracker Phase 3) is wired it refuses every exec — a sandbox that does not
isolate is more dangerous than none, so it is never faked. OS-specific
enforcers from the source (Seatbelt/Landlock/bwrap/Windows token) are not
ported; they are replaced by this service's future Wasm/microVM runner.

---

## The one governance fork (item #11, touches "do not change Sailor infra")

Sailor hard-constraint = don't touch infra; no sandbox primitive exists.
How Track A handles untrusted exec is a maintainer call — see chat checkpoint.
Everything else (SKIP/WRAP classification) is execution detail owned by the absorber.

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

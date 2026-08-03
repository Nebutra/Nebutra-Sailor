# @nebutra/agent-runtime

Status: **Track A live (grammar + gateway demo); Track B Phase 1 docked**

| Layer | State |
|-------|--------|
| Track A grammar (`runTurn`, policy, rollout, tools) | Shipped; gateway demo route behind `agent-runtime-demo` |
| Track B adapter (`createCarinaSandbox` → Carina JSON-RPC) | **Phase 1 done** ([#382](https://github.com/Nebutra/Nebutra-Sailor/pull/382)) |
| Track B host wire (env, ensureSession, `command_exec`, gateway bundle) | **Phase 2a done** (#386) |
| Track B ship (workspace map, approval resolve, auto-approve, status) | **Phase 2b done** |
| Product HITL UI (beyond API) | Optional |
| Default without Carina endpoint | **Fail-closed** (`REFUSING_SANDBOX`) |

Multi-tenant **agent-runtime grammar**. A faithful re-expression of a terminal
coding-agent's runtime *design* into Sailor's grammar — TypeScript,
multi-tenant, zero in-process untrusted-code execution.

## Why this exists

Sailor already covers the surrounding capabilities (`@nebutra/agents` for model
execution + provider routing + fallback + telemetry, `@nebutra/tenant`,
`@nebutra/db`, `@nebutra/permissions`, `@nebutra/queue`, `@nebutra/mcp`,
`backends/gateway`). What it lacked was a *coherent runtime grammar*: a
thread/turn/item model, a two-axis approval/capability policy, an event-sourced
session trace, and a uniform tool/MCP abstraction. This package supplies exactly
that and nothing else — it **wraps** existing primitives, it does not rebuild
them.

## Dual-track architecture

- **Track A (this package)** — policy, protocol contract, model, rollout. All
  tenant-scoped. Runs inside Sailor's TS web runtime.
- **Track B (Carina upstream)** — the **Nebutra/carina** kernel is the sole
  product isolator. Self-deployed, local-first. Sailor docks via
  `createCarinaSandbox` / `ExternalSandbox` — **kernel protocol is maintained
  in Carina**, not reimplemented here.

```ts
import {
  createCarinaSandbox,
  REFUSING_SANDBOX,
  type ExternalSandbox,
} from "@nebutra/agent-runtime";

// Production: only when a reachable Carina JSON-RPC base URL is configured.
const sandbox: ExternalSandbox = process.env.CARINA_JSONRPC_URL
  ? createCarinaSandbox({
      baseUrl: process.env.CARINA_JSONRPC_URL,
      token: process.env.CARINA_JSONRPC_TOKEN, // product/gateway cred — never owner unlock
    })
  : REFUSING_SANDBOX;
```

See `docs/architecture/2026-08-03-carina-track-b-upstream.md`.

## Modules

| Export | Capability | What it gives you |
|---|---|---|
| `./model` | thread/turn/item + event lifecycle | discriminated-union item taxonomy, `started/updated/completed/failed` SM, per-turn config snapshot+override |
| `./policy` | approval × capability axes | `ApprovalPolicy`, `CapabilityPolicy` (default `external_sandbox`), rule `Decision`, rich `ReviewDecision` |
| `./protocol` | JSON-RPC contract | method registry, **tenant+thread serialization scope**, server-initiated approval requests, notifications |
| `./tools` | uniform tool/MCP | `ToolRegistry` (registry→router→hooks), `adaptMcpTool` (MCP-as-adapter) |
| `./rollout` | event-sourced trace | append-only typed log, replay-to-state, compaction marker, per-item persistence policy |
| `./sandbox` | external-sandbox seam | `ExternalSandbox`; `createCarinaSandbox` (Track B); `REFUSING_SANDBOX` default; `createHttpSandbox` generic helper |
| `./adapters/*` | reusable concrete bindings | MCP catalog, Web-standard SSE transport, and Prisma rollout persistence without a separate package |

## Non-negotiables enforced here

- **Multi-tenant**: every scope, store key, and dispatch carries `tenantId`;
  cross-tenant requests can never share a serialization scope.
- **No in-process untrusted exec**: the default executor refuses; real
  execution is delegated to self-deployed Carina (or another `ExternalSandbox`).
- **No second kernel**: OS sandbox / capability enforcement stay in Carina.

See `docs/capabilities/agent-runtime/` for the capability map and replication
guide.

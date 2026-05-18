# @nebutra/agent-runtime

Status: **WIP**

> Status: WIP — not yet integrated into a production app. Track-B kernel
> transport and durable-turn queue binding are interface-only.

Multi-tenant **agent-runtime grammar**. A faithful re-expression of a terminal
coding-agent's runtime *design* into Sailor's grammar — TypeScript,
multi-tenant, zero infra changes, **no in-process untrusted-code execution**.

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
- **Track B (decoupled, not this repo)** — an optional self-hosted isolator /
  kernel sidecar that implements `ExternalSandbox` over the `./protocol`
  contract. The protocol is the only coupling seam.

## Modules

| Export | Capability | What it gives you |
|---|---|---|
| `./model` | thread/turn/item + event lifecycle | discriminated-union item taxonomy, `started/updated/completed/failed` SM, per-turn config snapshot+override |
| `./policy` | approval × capability axes | `ApprovalPolicy`, `CapabilityPolicy` (default `external_sandbox`), rule `Decision`, rich `ReviewDecision` |
| `./protocol` | JSON-RPC contract | method registry, **tenant+thread serialization scope**, server-initiated approval requests, notifications |
| `./tools` | uniform tool/MCP | `ToolRegistry` (registry→router→hooks), `adaptMcpTool` (MCP-as-adapter) |
| `./rollout` | event-sourced trace | append-only typed log, replay-to-state, compaction marker, per-item persistence policy |
| `./sandbox` | external-sandbox seam | `ExternalSandbox` delegation interface; fail-closed `REFUSING_SANDBOX` default |
| `./adapters/*` | reusable concrete bindings | MCP catalog, Web-standard SSE transport, and Prisma rollout persistence without a separate package |

## Non-negotiables enforced here

- **Multi-tenant**: every scope, store key, and dispatch carries `tenantId`;
  cross-tenant requests can never share a serialization scope.
- **No infra change**: no sandbox runtime, no new datastore — only interfaces.
- **No in-process untrusted exec**: the default executor refuses; real
  execution is delegated to a decoupled isolator.

See `docs/capabilities/agent-runtime/` for the capability map and replication
guide.

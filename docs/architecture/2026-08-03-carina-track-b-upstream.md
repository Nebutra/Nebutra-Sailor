# ADR 2026-08-03 — Carina as Track-B Upstream for Agent Execution

## Status

Accepted.

## Context

Sailor ships `@nebutra/agent-runtime` as a multi-tenant **runtime grammar**
(thread/turn/item, approval × capability policy, tool/MCP routing, event-sourced
rollout). It is designed dual-track:

- **Track A** — TypeScript control plane inside Sailor (this monorepo).
- **Track B** — a decoupled isolator / kernel that actually runs untrusted
  side effects behind `ExternalSandbox`.

Carina (`Nebutra/carina`, Go/Rust/Zig, local-first) owns the capability kernel,
OS sandbox backends, audit chain, and cloud boundary. Sailor must not grow a
second kernel.

Carina issue [#27](https://github.com/Nebutra/carina/issues/27) closed **not
planned**: foundations live as product-agnostic RPC + SDKs (v0.8.1+), not a
parallel `protocol/product-adapter/` package. Sailor docks to the **existing
catalog**, not a Sailor-only API.

## Decision

**Dock, do not replace.** Carina is the **upstream maintainer** of the Track-B
kernel. Sailor keeps `@nebutra/agent-runtime` and ships only a **thin adapter**.

```text
Nebutra Cloud (Sailor)
  @nebutra/agents          → model routing
  @nebutra/agent-runtime   → turn/policy/rollout (Track A)
        │  createCarinaSandbox  (JSON-RPC mapping, owned in Sailor)
        ▼
Carina kernel (upstream)   → command.exec, capability kernel, audit
```

### Ownership

| Concern | Owner |
|---------|--------|
| Kernel RPC catalog, capability profiles, OS sandbox | **Carina** |
| Multi-tenant turn grammar, approval rail, rollout | **Sailor** |
| `ExternalSandbox` + `createCarinaSandbox` mapping | **Sailor** |
| Default fail-closed without Carina endpoint | **Sailor** (`REFUSING_SANDBOX`) |

## Appendix A — v0.8.1 wire mapping

| Sailor | Carina (catalog) |
|--------|------------------|
| Hello / version pin | `gateway.hello` `{ protocol_version, client_id }` → require `protocol_version >= 1` |
| `SandboxExecRequest.threadId` | `command.exec` `session_id` (session must already exist) |
| `SandboxExecRequest.command` | `argv: ["/bin/sh", "-c", command]` (kernel still sees joined string) |
| `SandboxExecRequest.tenantId` | sent as extension `tenant_id` + `correlation_id` (scope/audit hint; **not** a privilege grant) |
| allowed + `CommandResult` | `exitCode` ← `exit_code`, `aggregatedOutput` ← stdout+stderr join |
| `decision: denied` | `SandboxDelegationError` status 403 |
| `decision: requires_approval` | `SandboxDelegationError` status 409, code `requires_approval` (host must call `task.action.approve` / `deny` — not implemented in the thin adapter yet) |
| `executedOn` | adapter default `"carina"` |
| Transport | HTTP POST JSON-RPC 2.0 to a connector/`baseUrl` (unix socket is Carina-native; products typically bridge) |

Bearer tokens are **Gateway / product credentials**, never local owner tokens
(Carina cloud boundary).

## Consequences

- Production injects Carina only when `CARINA_JSONRPC_URL` (or product config)
  is set; otherwise fail closed.
- Protocol breaks require Carina version bump + Sailor adapter pin update.
- Approval UI bridge and session lifecycle (`session.create`) remain host
  responsibilities layered on top of this exec adapter.

## Related

- Carina `docs/nebutra-cloud-boundary.md`, `docs/rpc-api.md`,
  `protocol/jsonrpc/methods.json`
- Carina issue #27 (closed not planned — use catalog, not product-adapter package)
- `@nebutra/agent-runtime` `src/sandbox.ts`

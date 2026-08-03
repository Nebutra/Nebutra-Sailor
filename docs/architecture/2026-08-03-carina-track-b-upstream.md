# ADR 2026-08-03 — Carina as Track-B Upstream for Agent Execution

## Status

**Accepted.** Phase 1 (catalog adapter) **closed**. Phase 2 (gateway product
wiring) tracked in [Nebutra-Sailor#384](https://github.com/Nebutra/Nebutra-Sailor/issues/384).

| Phase | Scope | State |
|-------|--------|--------|
| **1 — Dock** | `createCarinaSandbox` JSON-RPC map, fail-closed default, ADR, package tests | **Done** ([#382](https://github.com/Nebutra/Nebutra-Sailor/pull/382)) |
| **2a — Host wire** | Env resolve, `session.create` / ensureSession, `command_exec` tool, gateway bundle | **Done** (this tree; closes inject+session+tool in #384) |
| **2b — Product HITL** | Approval UI + `task.action.approve` / `deny`, multi-tenant workspace routing | **Open** ([#384](https://github.com/Nebutra/Nebutra-Sailor/issues/384)) |

## Context

Sailor ships `@nebutra/agent-runtime` as a multi-tenant **runtime grammar**
(thread/turn/item, approval × capability policy, tool/MCP routing, event-sourced
rollout). It is designed dual-track:

- **Track A** — TypeScript control plane inside Sailor (this monorepo).
- **Track B** — a decoupled isolator / kernel that actually runs untrusted
  side effects behind `ExternalSandbox`.

Carina (`Nebutra/carina`, local-first) owns the capability kernel, OS sandbox
backends, audit chain, and cloud boundary. Sailor must not grow a second kernel.

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
  HTTP JSON-RPC baseUrl     → self-deployed reachability
        │  (local HTTP bridge / private net / optional CF Tunnel)
        ▼
Carina daemon (upstream)    → capability kernel, command.exec, audit
  typical native listen: ~/.carina/daemon.sock
```

### Ownership

| Concern | Owner |
|---------|--------|
| Kernel RPC catalog, capability profiles, OS sandbox | **Carina** |
| Multi-tenant turn grammar, approval rail, rollout | **Sailor** |
| `ExternalSandbox` + `createCarinaSandbox` mapping | **Sailor** |
| Default fail-closed without Carina endpoint | **Sailor** (`REFUSING_SANDBOX`) |
| Self-deploy daemon + reachable HTTP endpoint | **Operator** (product / customer node) |
| Gateway inject + session lifecycle + exec tool | **Sailor** host (Phase 2 / #384) |

### Deployment topology (honest)

| Surface | What it is | Not |
|---------|------------|-----|
| `carina.nebutra.com` | Product **docs** (ECS static) | Not the exec API |
| Carina daemon | Self-deployed local-first runtime | Not multi-tenant SaaS sandbox-as-a-service |
| `CARINA_JSONRPC_URL` | HTTP POST JSON-RPC to a **reachable** connector | Not Unix socket from Node `fetch` |
| Cloudflare | Optional DNS / Tunnel / Access in front of a real node | Not a Workers-hosted Carina kernel |

Pattern matches normal SaaS agent docking: **control plane in Sailor, agent
runtime self-deployed, then wired**. No public `api.carina.*` execution origin
(see Carina `docs/nebutra-cloud-boundary.md`).

Bearer tokens are **Gateway / product credentials**, never local owner tokens.

## Appendix A — v0.8.1 wire mapping (Phase 1)

Catalog baseline: **Carina v0.8.1**. Pin: `CARINA_MIN_PROTOCOL_VERSION = 1`.

| Sailor | Carina (catalog) |
|--------|------------------|
| Hello / version pin | `gateway.hello` `{ protocol_version, client_id }` → require `protocol_version >= 1` |
| `SandboxExecRequest.threadId` | `command.exec` `session_id` (**session must already exist**) |
| `SandboxExecRequest.command` | `argv: ["/bin/sh", "-c", command]` (kernel still sees joined string) |
| `SandboxExecRequest.tenantId` | extension `tenant_id` + `correlation_id` (scope/audit hint; **not** a privilege grant) |
| allowed + `CommandResult` | `exitCode` ← `exit_code`, `aggregatedOutput` ← stdout+stderr join |
| `decision: denied` | `SandboxDelegationError` status 403 |
| `decision: requires_approval` | `SandboxDelegationError` status 409, code `requires_approval` (host must call `task.action.approve` / `deny` — Phase 2 optional) |
| `executedOn` | adapter default `"carina"` |
| Transport | HTTP POST JSON-RPC 2.0 to connector/`baseUrl` |

`createHttpSandbox` remains a **generic** Sailor-shaped HTTP helper for tests or
non-Carina isolators. Production Track B **prefers** `createCarinaSandbox`.

## Upstream updates

| Change type | Sailor action | Operator action |
|-------------|---------------|-----------------|
| Compatible daemon / optional fields | None | Upgrade daemon |
| Breaking `protocol_version` or method shape | Update `sandbox.ts` + `CARINA_MIN_PROTOCOL_VERSION` + tests, then ship | Upgrade daemon after adapter |
| New optional RPC (session, approval, workers) | Add host wiring only if product needs it | Deploy matching daemon |

Do **not** vendor Carina source into this monorepo. Follow
`protocol/jsonrpc/methods.json` and Carina release notes.

## Consequences

- Phase 1: adapter + tests on main; without endpoint, exec **fail-closed**.
- Phase 2a: gateway `createGatewayCarinaBundle()` injects when
  `CARINA_JSONRPC_URL` is set; `command_exec` calls `ensureSession` then
  `command.exec`. Requires `CARINA_WORKSPACE_ROOT` on the Carina host.
- Phase 2b (#384 remainder): human approval bridge and per-tenant workspace
  routing remain open.
- Protocol breaks require Carina version bump + Sailor adapter pin update.
- Approval UI bridge remains optional on top of the exec adapter.

## Related

- PR [#382](https://github.com/Nebutra/Nebutra-Sailor/pull/382) — Phase 1 adapter
- Issue [#384](https://github.com/Nebutra/Nebutra-Sailor/issues/384) — Phase 2 wire
- `@nebutra/agent-runtime` `src/sandbox.ts`
- Carina `docs/nebutra-cloud-boundary.md`, `docs/rpc-api.md`,
  `protocol/jsonrpc/methods.json`
- Carina issue #27 (closed not planned — use catalog, not product-adapter package)
- `docs/DOMAINS.md` — `carina.nebutra.com` is docs-only

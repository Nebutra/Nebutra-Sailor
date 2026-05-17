# @nebutra/agent-runtime-adapters

> Status: **WIP**. The durable rollout-store backend adapter is intentionally
> absent — see "Durable store" below.

Concrete, reusable port adapters for `@nebutra/agent-runtime`. That package is
deliberately dependency-free and ships only injectable ports; this package
supplies the wirings so any app/backend reuses them instead of re-gluing.

## Modules

| Export | Wires | Reusable in |
|---|---|---|
| `./mcp-catalog` | `@nebutra/mcp` `serverRegistry`+`mcpClient` → `McpServerCatalogPort` / `McpClientLike` | any runtime |
| `./dispatcher-sse` | `ProtocolDispatcher` → Web-standard `Request`/`Response` + `text/event-stream` | edge / workers / Node — zero framework lock-in |

Design constraints (enforced): every factory is dependency-injected (no hidden
globals; singletons are defaults, not requirements), tenantId is mandatory and
fail-closed at every boundary, Web-standard primitives only in the transport,
immutable data, zero brand leakage.

## Durable store

A correct rollout system-of-record needs **fail-loud** writes.
`@nebutra/audit`'s `log()` deliberately swallows transient failures (it is a
best-effort compliance log, not a source of truth), so it is **not** a sound
backend for `RolloutPersistencePort`. A durable adapter therefore requires a
dedicated datastore decision (a DB model + migration = infra change). It is
deliberately not shipped here rather than shipped subtly-wrong.

Until then, callers use `@nebutra/agent-runtime`'s in-memory store (process
-local, documented) and may additionally mirror turn events to the audit
trail for compliance — never as the rollout source of truth.

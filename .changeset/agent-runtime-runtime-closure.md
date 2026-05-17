---
"@nebutra/agent-runtime": minor
---

Close the runtime gap — four capabilities, all tenant-scoped & fail-closed,
each behind an injectable port so the package keeps zero datastore/queue
dependency ("no infra change" stays honest):

- **Durable / resumable turn** (`durable-turn.ts`): `createDurableTurn` wraps
  `runTurn` behind a `DurableTurnQueuePort`; `resume` replays the rollout and
  re-drives an unfinished turn, idempotent and cross-tenant isolated.
- **Protocol dispatcher** (`dispatcher.ts`): transport-agnostic JSON-RPC
  dispatcher serving the method registry — envelope validation fail-closed,
  per-`scopeKey` serialization (cross-tenant never shares a lane), errors
  mapped to JSON-RPC codes, validated notification stream.
- **MCP activation** (`mcp-bridge.ts`): `activateMcpTools` adapts tenant/plan
  -visible MCP-server tools into the uniform `ToolRegistry` via an injectable
  `McpServerCatalogPort`; duplicate names skipped, empty tenant fails closed.
- **Persistent rollout store** (`rollout-store-persistent.ts`):
  `PersistentRolloutStore` over a `RolloutPersistencePort` (satisfiable by an
  `@nebutra/audit`/`@nebutra/db` adapter) — monotonic per-(tenant,thread)
  seq, faithful round-trip, cross-tenant isolation, typed round-trip errors.

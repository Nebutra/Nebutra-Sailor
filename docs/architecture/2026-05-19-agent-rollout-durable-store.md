# 2026-05-19 — Durable rollout store for agent-runtime

## Status

Accepted.

## Context

`@nebutra/agent-runtime` is event-sourced: a turn is resumable only if its
rollout is durably persisted. The package ships a `RolloutPersistencePort`
(fail-loud: it must never silently drop a line) with an in-memory reference
impl. A production system-of-record is required.

`@nebutra/audit` was evaluated and **rejected** as the backend: its
`AuditProvider.log()` deliberately swallows transient failures (it is a
best-effort compliance log). Using it as the rollout source-of-truth would
silently lose turn history and break resume — a correctness, not performance,
problem.

## Decision

A dedicated, tenant-scoped Postgres table is the rollout system-of-record.

- New Prisma model `AgentRolloutLine` → table `agent_rollout_lines`, additive
  migration `20260519000000_add_agent_rollout_store` (one `CREATE TABLE`,
  touches nothing existing).
- Unique `(tenant_id, thread_id, seq)` is the ordering + no-loss guarantee;
  duplicate/missing seq is rejected (fail-loud), not swallowed.
- The adapter `createPrismaRolloutPersistence` lives in
  `@nebutra/agent-runtime/adapters/prisma-rollout` and depends only on a minimal injected
  `PrismaRolloutDelegate` (the `PrismaAuditDelegate` pattern) — **not** on the
  generated client or `@nebutra/db`, keeping the package dependency-light and
  reusable. A per-tenant resolver lets callers pass `getTenantDb(orgId)` so
  RLS applies.

This is an infra change; per `backends/README` / TS-by-default ADR governance
it gets this ADR. It is purely additive and isolated from other in-flight
schema work (appended at schema EOF; standalone migration dir).

## Activation (deliberately staged, not faked)

The gateway route reads rollouts from the in-memory store **by default**.
The durable path is opt-in via `AGENT_ROLLOUT_DURABLE=1`. Activation is a
standard deploy sequence, not code change:

1. `prisma migrate deploy` applies `20260519000000_add_agent_rollout_store`.
2. `prisma generate` regenerates the client so `db.agentRolloutLine` exists.
3. Set `AGENT_ROLLOUT_DURABLE=1`.

Step 2 (client regen) is intentionally **not** performed in the change that
introduces the model: the generated client is a shared artifact churned by
concurrent schema work, and regenerating it here would entangle unrelated
in-flight migrations. It happens through the normal migrate/generate flow.

## Consequences

- Resume/audit of turns becomes durable and multi-tenant-isolated once
  activated.
- Until activated, behaviour is unchanged (in-memory, process-local) — no
  regression, no silent half-durability.
- Rollback: drop the table + revert the additive model block; no existing
  data or model is affected.

---
"@nebutra/agent-runtime-adapters": minor
"@nebutra/gateway": minor
---

Durable rollout-store backend (the agent-runtime system-of-record).

- New Prisma model `AgentRolloutLine` → table `agent_rollout_lines`, additive
  migration `20260519000000_add_agent_rollout_store` (one CREATE TABLE).
- `createPrismaRolloutPersistence` in `@nebutra/agent-runtime-adapters`:
  fail-loud `RolloutPersistencePort` over a minimal injected
  `PrismaRolloutDelegate` (no generated-client / `@nebutra/db` dependency;
  per-tenant resolver for RLS). 6 TDD tests.
- Gateway route store is env-gated: `AGENT_ROLLOUT_DURABLE=1` selects the
  durable Postgres store, default stays in-memory. Activation is a standard
  migrate+generate deploy step (ADR 2026-05-19), not faked durability.

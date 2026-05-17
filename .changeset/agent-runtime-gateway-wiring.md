---
"@nebutra/gateway": minor
---

Wire `@nebutra/agent-runtime` live into the gateway.

- New route `POST /api/v1/agent-runtime/turns`: drives a tenant-scoped turn
  via `runTurn`, streamed to the client over SSE. Gated by `requireAuth` and
  the off-by-default `agent-runtime-demo` feature flag.
- `ModelInvoker` is a thin bridge over `@nebutra/agents` (real model stack,
  no provider re-port); `ApprovalGate` is fail-closed (unapproved tools never
  dispatched).
- Honest scope: rollout store is process-local `InMemoryRolloutStore` — the
  durable tenant-scoped store needs a DB model (infra change) and is
  deliberately deferred, not faked. No command-exec tool is registered yet,
  so the external-sandbox seam has nothing to delegate until one is added.

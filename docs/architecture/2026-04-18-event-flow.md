# ADR: Canonical Event Flow

- **Date**: 2026-04-18
- **Status**: Accepted
- **Supersedes**: (ad-hoc use of `packages/event-bus`, `packages/saga`, `packages/queue`)

## Context

The codebase currently ships three overlapping asynchronous primitives with no documented ownership boundary:

| Package | Status | Responsibility |
|---|---|---|
| `@nebutra/event-bus` | WIP | Domain-event pub/sub with Inngest durability layer + in-memory fan-out |
| `@nebutra/saga` | WIP | Multi-step orchestration with compensation on failure |
| `@nebutra/queue` | Foundation | Background job execution (QStash / BullMQ / in-memory) |

Before this ADR, application code could reach for any of the three interchangeably. That caused:

- Duplicated retry/backoff logic in each package (each re-implements its own).
- Ambiguity about where idempotency is enforced — at the publisher, the subscriber, or the queue worker?
- Risk of double-billing when the same domain event is delivered through two code paths (bus + queue) that both write to `UsageLedgerEntry`.

## Decision

A single directed flow is canonical. All async work MUST follow it.

```
                  ┌──────────────────────────┐
                  │   Domain action occurs   │
                  │  (HTTP route / webhook / │
                  │   cron / internal call)  │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │    event-bus.publish()   │   at-least-once
                  │  (Inngest = durability)  │   durable journal
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │                          │
                  ▼                          ▼
     ┌────────────────────────┐   ┌────────────────────────┐
     │   queue worker         │   │   saga orchestrator    │
     │   long-running async   │   │   multi-step trx with  │
     │   (upload, email,      │   │   compensation         │
     │   export, indexing)    │   │   (order, onboarding)  │
     └────────────┬───────────┘   └────────────┬───────────┘
                  │                            │
                  ▼                            ▼
         side effects                 side effects
         (DB writes, third-           (DB writes, external
          party calls)                 API calls)
```

### Rules

1. **Producers only talk to `event-bus`.** HTTP routes, webhook handlers, cron jobs and internal services publish domain events. They never enqueue queue jobs directly and never invoke sagas directly.
2. **Subscribers are one of two shapes.** An event-bus subscriber is either:
   - a **queue worker** — enqueues itself to `@nebutra/queue` for long-running execution (separation of delivery from execution), or
   - a **saga orchestrator** — starts a transactional workflow that needs compensation on mid-way failure.
3. **Subscribers are idempotent.** Every subscriber MUST treat `event.id` as its idempotency key. Re-delivery of the same event MUST have the same effect as a single delivery.
4. **Writes that must not duplicate MUST use a DB unique-constraint claim.** In-memory dedup is not durable and is forbidden for monetary operations (billing / usage ledger / credits).

## Semantics

| Layer | Delivery | Ordering | Retry | Idempotency responsibility |
|---|---|---|---|---|
| `event-bus.publish()` | at-least-once (duplicates possible) | not guaranteed | Inngest retries failed subscribers with exponential backoff | subscriber |
| `queue.enqueue()` | at-least-once, DLQ after N retries | FIFO per queue | provider handles retry + DLQ | job handler |
| `saga.execute()` | exactly-once per step (via step-level idempotency key) | linear, reverse-compensating | step retries before compensation | per-step key via `@nebutra/saga/idempotency` |

## Integration pattern

```ts
// 1. Route publishes a domain event — NEVER enqueues directly.
import { eventBus } from "@nebutra/event-bus";

app.post("/api/v1/billing/usage", async (c) => {
  const input = validate(c);
  await eventBus.publish(
    eventBus.createEvent("usage.ledger.appended", input, {
      source: "api-gateway",
      tenantId: input.organizationId,
    }),
  );
  return c.json({ accepted: true }, 202);
});
```

```ts
// 2. Subscriber writes idempotently to the ledger.
eventBus.subscribe("usage.ledger.appended", async (event) => {
  await ledgerRepo.claim({
    organizationId: event.data.organizationId,
    idempotencyKey: event.id,
    // ... rest of the payload
  });
});
```

```ts
// 3. Saga uses the step idempotency helper.
import { idempotent, InMemoryIdempotencyStore } from "@nebutra/saga";

const store = new InMemoryIdempotencyStore();

const saga = createSaga<OrderCtx>("order", eventBus)
  .addStep({
    name: "charge-card",
    execute: idempotent(`order:${ctx.orderId}:charge`, async (ctx) => {
      return stripe.charge(ctx);
    }, store),
  });
```

## Testing contract

The following invariants are enforced by automated tests in this repo:

| Invariant | Test file |
|---|---|
| Publishing the same `event.id` twice results in one effective ledger row | `apps/api-gateway/src/__tests__/billing-idempotency.test.ts` |
| Saga step wrapped with `idempotent(key, fn)` — `fn` runs exactly once for the same key | `packages/saga/src/__tests__/idempotency.test.ts` |
| `UsageLedgerEntry.(organizationId, idempotencyKey)` is a unique constraint at the DB layer | `packages/db/prisma/schema.prisma` |
| Different tenants may reuse the same idempotencyKey | `apps/api-gateway/src/__tests__/billing-idempotency.test.ts` |

## Consequences

### Positive

- One place to reason about retries and at-least-once semantics (the bus).
- Billing routes are safe under network retries and client duplication.
- Sagas get reliable step-level dedup without each caller reinventing it.
- Easier migration to a different durability layer (Kafka / NATS) in the future — only the bus's Inngest adapter changes.

### Negative

- Callers that previously wrote ledger rows synchronously now go through a publish step. Response semantics change from 201 to 202 for the eventual-consistency path. The synchronous POST route documented in the tests retains 201/200 for the immediate-write case.
- The canonical flow introduces an extra hop; latency-sensitive paths (< 50 ms) should write directly through a repository `claim()` method and still publish the event for audit.

## Alternatives considered

1. **Merge all three packages into one.** Rejected: delivery (`event-bus`) and execution (`queue`) have different SLAs and different durability stores; conflating them makes the trade-offs invisible.
2. **Let subscribers call `queue.enqueue()` directly without a bus.** Rejected: loses the audit log of what happened and couples producers to the shape of every consumer.
3. **In-memory idempotency cache per process.** Rejected: not durable under restarts, not shared across gateway replicas. Only acceptable for `saga` step-level dedup inside a single saga run.

# event-log capability map

## Depends on

`content-store`.

## Decision

PORT. Build Sailor's append-only event log with content-addressed snapshots, rollback dry-runs, branching, and timeline queries.

## Three-tier mapping

| Tier | Scope | Sailor landing |
| --- | --- | --- |
| SKIP | Mutable event updates | Not allowed |
| WRAP | Content-store file truth | `content-store` remains the owner |
| PORT | Event records, object hashes, dry-run rollback, branches | `packages/ai/event-log` |

## Public contract

- `EventLog.open(root, { tenantId, summarize })`
- `log.commit(event)`
- `log.rollbackTo(id)`
- `log.branchFrom(id, name)`
- Command alias: `pnpm chronos:timeline`

## Multi-tenant posture

Events, branches, and object indexes are stored per tenant. Rollback is dry-run only in Layer 0 and never silently rewrites content.

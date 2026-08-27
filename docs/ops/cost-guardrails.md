# Cost guardrails

What stops a runaway bill on PlanetScale and Upstash, what is enforced in this
repo, and what can only be set in a provider console.

None of it changes behaviour for normal traffic. Every limit here is set above
what real usage does; the point is to bound the failure, not to shape the
success.

## Where the money actually goes

Ranked by how much damage a single bad day can do:

| Risk | Ceiling | Enforced by |
| --- | --- | --- |
| AI token spend | none today | **open — see below** |
| Postgres storage growth | retention windows | `retention.sql` + Cron Trigger |
| Postgres runaway query CPU | 30s | role `statement_timeout` |
| Postgres connection exhaustion | 50 | role `CONNECTION LIMIT` |
| Redis command volume | plan cap | Upstash console budget |
| Redis memory | 3 GB | plan cap, enforced by provider |

The database guardrails bound tens-to-hundreds of dollars. An AI gateway with
no per-request ceiling can burn thousands in one night, and it is the one row
in that table with nothing in the third column.

## PlanetScale

### Enforced in this repo

`infra/data/database/policies/cost-guardrails.sql`, applied to `app_user` by
`scripts/provision-fresh-database.sh`. These are role defaults, not call-site
settings: `@nebutra/db` sets `statement_timeout` with `SET LOCAL` inside
`getTenantDb`, which covers only queries that go through `getTenantDb`. A raw
client or a future code path that forgets inherits nothing. Role defaults apply
to every session the role opens.

| Setting | Value | What it prevents |
| --- | --- | --- |
| `statement_timeout` | 30s | A runaway query bills CPU for as long as it runs |
| `idle_in_transaction_session_timeout` | 60s | The expensive one — a client that opens a transaction and stops blocks autovacuum database-wide, so storage grows and never comes back, while pinning one of the origin's 15 connections |
| `lock_timeout` | 10s | Fail one query instead of queueing every session behind a held lock |
| `idle_session_timeout` | 15min | A silent connection still occupies a slot |
| `CONNECTION LIMIT` | 50 | A leaking loop cannot take every slot the plan allows |

Verified on PostgreSQL 17.8: a 35s query on a raw connection that never touched
`getTenantDb` is cancelled at 30s, and a transaction left idle is terminated by
the server.

Storage is handled separately by `retention.sql` — eight append-only tables
with windows from 7 days (expired sessions) to 400 days (billing evidence),
purged nightly by a Cron Trigger on the gateway Worker.

Audit with `scripts/db-cost-audit.sh "<admin url>"`: size, bloat, sessions idle
in a transaction, connection use, and tables with no retention policy.

### Only in the PlanetScale console

- **Cluster size.** Compute is the fixed part of the bill. Resizing is the only
  way it changes, so it cannot run away on its own — but it also will not
  autoscale down.
- **Branch count.** Every branch is a running cluster. Delete dev branches when
  finished; this is the most common surprise line item.
- **Backup retention.** Longer retention is more stored bytes.

## Upstash

### What actually bills

Commands, not gigabytes. `maxmemory` is 3 GB and enforced by the provider, so
memory cannot run away — `total_commands_processed` is the meter.

Audit with:

```bash
UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… scripts/redis-cost-audit.sh
```

It reports memory against the cap, eviction and expiry counts, hit rate,
command volume, and — sampled directly rather than inferred from `INFO`, which
lags behind deletes — which keys carry no TTL.

A key written without an expiry is permanent: nothing reclaims it, and nothing
reports it. Every live write path in this codebase sets one today (idempotency
locks, rate-limit buckets, every cache strategy); the audit exists to catch the
one that eventually does not.

### Only in the Upstash console

- **Max monthly budget.** The hard ceiling. Nothing in this repo can enforce a
  spend cap; set it on the database's billing settings.
- **IP allowlist: leave it empty.** Cloudflare Workers egress from a large,
  changing set of addresses, so an allowlist cannot be made to fit them — with
  one configured, the gateway cannot reach Redis at all. Restrict access with a
  read-only token instead if it is needed.

### One thing that is not a cost setting

The eviction policy is `optimistic-volatile`, which evicts keys that have a
TTL. That is correct for cache. But idempotency locks and rate-limit buckets
also carry TTLs, so under real memory pressure they can be evicted too — and
that surfaces as duplicate work or a missed limit, not as an error. Memory
headroom is a correctness property here, not only a cost one. Treat sustained
`evicted_keys` growth as a bug, not as the cache doing its job.

## Still open: AI token spend

The balance guard in `packages/platform/gateway-core/src/auth/balance-guard.ts`
checks `balance > 0` against a 30-second Redis cache. Two gaps:

1. **Concurrency.** Within that 30s window every concurrent request reads the
   same cached positive balance and is admitted. At high concurrency a tenant
   spends well past zero before the cache expires.
2. **No per-request ceiling.** A balance of one cent admits a request that can
   cost fifty dollars — nothing bounds `max_tokens` or context size.

Closing (1) properly needs an atomic reserve-then-settle, which the current
Redis interface cannot express: it exposes `get`/`set`/`del` with no
`INCRBY`/`DECRBY`. Closing (2) is cheaper and independent — a hard ceiling on
`max_tokens` and request size bounds the worst case per request without
touching normal traffic.

Neither is done.

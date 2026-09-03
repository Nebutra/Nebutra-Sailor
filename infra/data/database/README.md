# Database Infrastructure

## Architecture

```
packages/platform/db/              → Prisma schema (single source of truth)
infra/data/database/           → Database-level configs (RLS, extensions)
infra/iac/terraform/          → Cloud infrastructure provisioning
```

## Schema Management

**All models defined in `packages/platform/db/prisma/schema.prisma`**

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema (dev only)
pnpm db:studio      # Open Prisma Studio
```

## Row Level Security (RLS)

RLS policies are in `policies/rls.sql`. Apply after migrations:

```bash
psql $DATABASE_URL -f infra/data/database/policies/rls.sql
```

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector for embeddings
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."      # Pooled connection
DIRECT_URL="postgresql://..."        # Direct (for migrations)
```

## DB Consumption Topology

One rule: **product apps in this monorepo → the shared platform database.**
That database is **PlanetScale Postgres** as of 2026-07, provisioned from the
Cloudflare dashboard. Supabase was the previous home and is kept running only
because it holds everything written before the cutover — see
[the migration runbook](../../../docs/ops/postgres-to-planetscale-via-cloudflare.md)
and [ADR 2026-06-04](../../../docs/architecture/2026-06-04-production-runtime-closure.md).
(Personal portfolio `tsekaluk-dev` is a separate repo with its own Neon — see
`docs/architecture/2026-07-27-tsekaluk-dev-extraction.md`.)

Two ways in, decided by where the code runs:

| Runtime | Connection |
|---|---|
| Cloudflare Workers | **Hyperdrive** binding — the edge connection pool. `apps/auth` ships one; so does `nebutra-retention` |
| Everything else (ECS Origin, Vercel, Fly) | **PgBouncer pooled `DATABASE_URL`**. PlanetScale serves PgBouncer on `6432`, direct on `5432` |

| App / backend | Database | How |
|---|---|---|
| `apps/web` | **PlanetScale** (`packages/platform/db` schema) | `@nebutra/db` (Prisma, `getTenantDb`/`getSystemDb`) |
| `apps/auth` | **PlanetScale** | Hyperdrive binding in `wrangler.edge.jsonc`; falls back to `DATABASE_URL` when the binding is absent |
| `apps/sleptons` | **PlanetScale** (shared platform schema) | `@nebutra/db` `getSystemDb`; tables `sleptons_*` live IN the platform schema — no own schema |
| `apps/idp`, `apps/landing`, `backends/python/ai` | **PlanetScale** | `@nebutra/db` / asyncpg; `DATABASE_URL` injected by the deploy env |
| `backends/gateway` | **none** | The deployed entry is `wrangler.edge.toml`, which carries no Hyperdrive binding on purpose: it forwards every authenticated decision to the origin so it holds nothing worth stealing. `wrangler.toml` documents the full gateway and is not deployed |
| `apps/kuanlan` | **none** | R2 only. Not an oversight to correct casually — see [the productization roadmap](../../../docs/plans/2026-09-03-kuanlan-productization-roadmap.md) |

Every tenant transaction issues `SET LOCAL ROLE` with `APP_DB_ROLE` (`app_user`).
If that role is unset or wrong the SET fails and the query runs as whatever the
connection is, which is the one thing tenant isolation cannot afford to get
wrong.

Never point a platform app at Neon — `apps/sleptons` drifted that way once (it shared the Neon `apps/web` later migrated off) and was repointed 2026-06-06. Each app's `.env.example` documents its intended provider.

`.github/workflows/ops-db-inventory.yml` answers "where is this app's database
actually pointing" against the live boxes, which is the only answer this file
cannot give you.

## Retention

`policies/retention.sql` defines `public.purge_expired_rows()`, driven by rows in
`public.retention_policies` — so a retention window is **data, not code**. Adding
one is an INSERT, not a deploy.

The caller is `backends/gateway/src/worker-retention.ts` with
`wrangler.retention.toml`: its own Worker, one Hyperdrive binding, no route, a
Cron Trigger at 02:17 Asia/Shanghai. It is separate from the gateway edge Worker
on purpose — giving that one a database connection to save a file would undo the
reason it holds nothing.

**Nothing in this repository deploys it.** No workflow references
`wrangler.retention.toml`. If the purge is running in production, it was shipped
by hand, and this repo cannot tell you that it is. Check before relying on a
retention window to actually expire anything.

## Provider Compatibility

The schema is plain PostgreSQL, so it runs on any of these. **PlanetScale
Postgres is the one in production**; the rest are switchable targets, not
descriptions of the current deployment:

- PlanetScale Postgres ← in use
- Supabase ← previous home, still holds pre-cutover data
- Neon
- AWS RDS for PostgreSQL
- Google Cloud SQL for PostgreSQL
- Self-hosted Postgres

PlanetScale Vitess/MySQL is a separate future template path. It would need a
MySQL/Vitess schema, adapter, relation/index strategy, and migration workflow;
it is not a drop-in replacement for this Postgres runtime.

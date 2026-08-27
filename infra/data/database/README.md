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

One rule: **product apps in this monorepo → the shared platform Supabase.**
(Personal portfolio `tsekaluk-dev` is a separate repo with its own Neon — see
`docs/architecture/2026-07-27-tsekaluk-dev-extraction.md`.)

| App / backend | Database | How |
|---|---|---|
| `apps/web` | **Supabase** (`packages/platform/db` schema) | `@nebutra/db` (Prisma, `getTenantDb`/`getSystemDb`) |
| `apps/sleptons` | **Supabase** (shared platform schema) | `@nebutra/db` `getSystemDb`; tables `sleptons_*` live IN the platform schema — no own schema |
| `apps/idp`, `apps/landing`, `backends/gateway`, `backends/python/ai` | **Supabase** | `@nebutra/db` / asyncpg; `DATABASE_URL` injected by the deploy env (Cloudflare/Vercel/ECS) |

Never point a platform app at Neon — `apps/sleptons` drifted that way once (it shared the Neon `apps/web` later migrated off) and was repointed to Supabase 2026-06-06. Each app's `.env.example` documents its intended provider.

## Provider Compatibility

This setup works with PostgreSQL providers:

- Supabase
- Neon
- PlanetScale Postgres
- AWS RDS for PostgreSQL
- Google Cloud SQL for PostgreSQL
- Self-hosted Postgres

PlanetScale Vitess/MySQL is a separate future template path. It would need a
MySQL/Vitess schema, adapter, relation/index strategy, and migration workflow;
it is not a drop-in replacement for this Postgres runtime.

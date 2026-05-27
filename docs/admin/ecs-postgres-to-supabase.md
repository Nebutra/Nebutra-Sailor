# ECS PostgreSQL to Supabase migration

This runbook moves the production database from the ECS-hosted PostgreSQL
container to Supabase PostgreSQL without changing application query code.

Do not commit real connection strings. Keep them in the ECS runtime `.env`,
GitHub Actions secrets, or a local operator shell.

## Decision

Use Supabase only as the managed PostgreSQL provider. Do not add
`@supabase/ssr` or per-page Supabase clients for this migration. Nebutra's
runtime database access is Prisma via `DATABASE_URL`; Supabase Realtime,
Storage, and Auth remain separate provider surfaces.

The Supabase Next.js quickstart values are optional for browser Supabase APIs:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://emxrolwfyaiybohlygig.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

They do not migrate or connect Prisma to the production database. The production
database cutover requires the Postgres `DATABASE_URL` and `DIRECT_URL` below.

## Supabase setup

In the Supabase dashboard, get both database connection strings:

- `DATABASE_URL`: Supavisor session pooler, port `5432`, for application
  runtime traffic.
- `DIRECT_URL`: direct connection to `db.<project-ref>.supabase.co`, for
  restore and Prisma migrations.

Enable required extensions before restore:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```

This repo uses the `public` and `auth` PostgreSQL schemas. Supabase already owns
an `auth` schema for Supabase Auth, so restore into a fresh project and verify
that Nebutra's Better Auth tables (`auth.organization`, `auth.member`,
`auth.invitation`, `auth.passkey`) do not conflict with Supabase-managed tables.

## Dry run

Run from a trusted operator machine with network access to both databases, or
from the ECS box if Supabase allows that IP.

```bash
export SOURCE_DATABASE_URL="postgresql://postgres:<ecs-password>@127.0.0.1:5432/nebutra?schema=public"
export SUPABASE_DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"

bash infra/ops/scripts/migrate-ecs-postgres-to-supabase.sh all
```

The script writes:

- `source-counts.tsv`
- `target-counts.tsv`
- a directory-format `pg_dump`
- the filtered `pg_restore` table of contents

The migration is not accepted unless `source-counts.tsv` and
`target-counts.tsv` match exactly.

## Cutover

1. Announce a short write freeze.
2. Stop or pause write-capable ECS processes.
3. Re-run the migration script with a fresh `MIGRATION_DIR`.
4. Run Prisma migration deploy against the Supabase direct URL:

   ```bash
   DATABASE_URL="$SUPABASE_DATABASE_URL" \
   DIRECT_URL="$SUPABASE_DIRECT_URL" \
   pnpm --filter @nebutra/db db:migrate:deploy
   ```

5. Update ECS runtime env files so application processes use Supabase:

   ```bash
   DATABASE_URL="<Supabase session pooler URL>"
   DIRECT_URL="<Supabase direct URL>"
   ```

6. Reload the ECS processes.
7. Verify public health:

   ```bash
   curl -fsS https://api.nebutra.com/api/misc/health
   ```

8. Keep the old ECS PostgreSQL container and volume untouched until the new
   production database has passed a full business-flow smoke test.

## Rollback

If health checks or business smoke tests fail before new writes are accepted,
restore the previous ECS `.env` values and reload ECS processes. Do not delete
the old `postgres_data` Docker volume during the migration window.

If writes have already landed in Supabase, rollback becomes a data reconciliation
job. Freeze writes first, dump Supabase, and decide whether to replay the delta
back to ECS or fix forward on Supabase.

## Notes

- `packages/platform/db/prisma.config.ts` uses `DIRECT_URL` for Prisma
  migrations when it is present and falls back to `DATABASE_URL` for local
  Docker PostgreSQL.
- Use Supavisor session mode, not transaction mode, for runtime
  `DATABASE_URL`. The RLS helpers depend on request-scoped session settings.
- The publishable Supabase key is not a database migration credential. It is
  only for browser/client Supabase APIs.

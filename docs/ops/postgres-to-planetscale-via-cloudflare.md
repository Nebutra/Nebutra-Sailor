# Migrating Postgres from Supabase to PlanetScale (via Cloudflare)

Moves the platform database onto the Postgres you provision from the
Cloudflare dashboard, reached from the Workers gateway through Hyperdrive.

## What this is, precisely

Cloudflare does not run its own managed Postgres. What the dashboard offers is
**PlanetScale Postgres**, provisioned from Cloudflare and connected through
**Hyperdrive**, Cloudflare's edge connection pool. Billing is moving to the
Cloudflare account; the database itself is PlanetScale's.

That distinction matters only for the invoice. It is real PostgreSQL, so the
parts of this codebase that would have died on D1 (SQLite) all survive:

| Depends on | Count | On PlanetScale Postgres |
| --- | --- | --- |
| RLS policies | 80 | Supported — `CREATE ROLE … NOSUPERUSER` with `BYPASSRLS` off |
| `@@schema` (`public`, `better_auth`) | 125 refs | Supported |
| `Decimal` (billing amounts) | 24 | Supported — no precision loss |
| `Json` | 61 | Supported — JSONB intact |
| `vector`, `uuid-ossp` | 2 extensions | Both supported (`vector` needs superuser to create) |
| Prisma migrations | 29 | Replay unchanged |

The RLS policies reference exactly one role — `app_user` — and no Supabase
role (`service_role`, `authenticated`, `anon`) appears anywhere in
`infra/data/database/policies/rls.sql`. The tenancy model ports as-is.

## Why Hyperdrive is not optional here

Workers isolates do not share a connection pool. A plain `DATABASE_URL` in a
Worker opens a fresh Postgres connection per isolate, so the database runs out
of connection slots long before the Worker runs out of capacity. Hyperdrive
holds the pool at the edge and hands the Worker a connection string.

`backends/gateway/src/worker.ts` copies `env.HYPERDRIVE.connectionString` into
`process.env.DATABASE_URL` before delegating to the app, because `@nebutra/db`
builds its `pg.Pool` lazily from that variable and bindings do not appear on
`process.env`. Off Workers the binding is absent and `DATABASE_URL` is used
unchanged — ECS Origin and local development are untouched.

## Pre-flight

```bash
# 1. Confirm the source is reachable and note its size
psql "$SUPABASE_DATABASE_URL" -c "\l+" | grep nebutra

# 2. Confirm nothing Supabase-specific crept into the policies since this doc
rg -c "service_role|authenticated|anon|supabase" infra/data/database/policies/rls.sql   # expect 0
```

## 1. Provision

Create the Postgres database from the Cloudflare dashboard (Storage &
Databases → PlanetScale). Then create the non-superuser application role — RLS
is bypassed by any role holding `SUPERUSER` or `BYPASSRLS`, so this role is
what makes tenant isolation real rather than decorative:

```sql
CREATE ROLE app_user LOGIN PASSWORD '<generated>' NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public, better_auth TO app_user;
```

Set `APP_DB_ROLE=app_user` in the gateway environment — `@nebutra/db` issues
`SET LOCAL ROLE` with it inside every tenant transaction.

## 2. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;   -- needs superuser; use the admin role
```

## 3. Move the data

Schema and data separately, so the RLS policies land after the tables exist
and before the application can reach them.

```bash
export SOURCE_URL="<Supabase session pooler URL>"
export TARGET_URL="<PlanetScale direct URL, not the Hyperdrive one>"

pg_dump "$SOURCE_URL" --schema-only  --no-owner --no-privileges -f schema.sql
pg_dump "$SOURCE_URL" --data-only    --no-owner --disable-triggers -f data.sql

psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f schema.sql
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f data.sql
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f infra/data/database/policies/rls.sql
```

Use the **direct** connection string for the restore. Hyperdrive caches
queries and is built for request traffic, not bulk load.

## 4. Verify isolation before cutting over

The migration is only correct if RLS still bites. Connect **as `app_user`**,
not as the admin role:

```sql
SET LOCAL ROLE app_user;
SELECT set_config('app.current_tenant_id', '<tenant-a-id>', true);
SELECT count(*) FROM api_keys;                       -- only tenant A's rows
SELECT set_config('app.current_tenant_id', '', true);
SELECT count(*) FROM api_keys;                       -- expect 0, not everything
```

A non-zero count on the second query means the policies did not apply or the
role bypasses them. Stop and fix before cutting over — this is the check that
distinguishes a migration from a data leak.

## 5. Wire Hyperdrive

```bash
wrangler hyperdrive create nebutra-prod --connection-string="$TARGET_URL"
```

Put the returned id into `backends/gateway/wrangler.toml` under
`[[hyperdrive]]`. It is intentionally empty in the repo so a missing binding
fails at deploy rather than silently pointing a production Worker at whatever
`DATABASE_URL` happens to be set.

## 6. Cut over

1. Deploy the gateway with the Hyperdrive binding.
2. Point ECS Origin's `DATABASE_URL` at the PlanetScale direct URL.
3. Watch error rates and connection counts for one traffic peak.
4. Keep Supabase running, read-only, until you are satisfied — the rollback is
   swapping `DATABASE_URL` back, and it stops being available the moment you
   delete the project.

## Out of scope

- Personal portfolio `tsekaluk-dev` (separate repo) runs on its own Neon and is decoupled from this
  monorepo. It is not part of this migration.
- `packages/ops/supabase` (realtime client) is a provider option, not the data
  path. It keeps working against a Supabase project if one is still around,
  and is simply unused otherwise.
- ClickHouse (metering) and Upstash (queue/cache) are separate stores and are
  not affected.

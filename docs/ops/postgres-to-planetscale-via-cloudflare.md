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

## Provisioning a fresh database

There is no data to carry over, so this is a create-and-go, not a migration.
One command does schema, role, RLS, and an isolation self-check:

```bash
export APP_DB_PASSWORD="$(openssl rand -base64 24)"   # keep this; it is the app credential
scripts/provision-fresh-database.sh "<PlanetScale admin url>"
```

It refuses to run against a database that already has tables, and it exits
non-zero if the isolation check fails — see below for why that check is the
whole point.

### Do not use `prisma migrate deploy` for this

`prisma/migrations` has no baseline. The earliest entry,
`20260313000000_enable_rls`, ALTERs tables that no migration in the folder ever
creates, so replaying the folder onto an empty database dies immediately on
`relation "organizations" does not exist`. Verified against a virgin
PostgreSQL 17.8: `migrate deploy` fails on migration 5 of 28.

The schema of record is `schema.prisma`. The script builds from it with
`prisma migrate diff --from-empty --to-schema`, which produces all 86 tables
cleanly. The migrations folder remains meaningful only for databases that
already carry the pre-2026-03 baseline — i.e. the existing Supabase one.

### What the script does, and why each step matters

1. **Schemas + extensions** — `public`, `better_auth`, plus `uuid-ossp` and
   `vector`. `vector` needs superuser on managed providers, so run the script
   with an admin role, not the application role it creates.
2. **Schema** — 86 tables from a from-empty diff.
3. **Application role** — `CREATE ROLE app_user … NOSUPERUSER NOBYPASSRLS`.
   Neither attribute is cosmetic: either one makes every policy below a no-op
   and tenant isolation silently ceases to exist.
4. **RLS** — all 80 policies from `infra/data/database/policies/rls.sql`.
   They reference exactly one role, `app_user`, and nothing Supabase-specific.
5. **Isolation self-check** — inserts two probe tenants, then reads back *as
   the application role*: scoped to one tenant it must see only that tenant;
   with no tenant set it must see zero rows. A non-zero count there means the
   policies did not attach or the role bypasses them. That is a data leak, not
   a warning, so the script exits non-zero and deletes the probes either way.

This sequence was validated end to end on a virgin PostgreSQL 17.8 with
`vector 0.8.1` — the same extension version PlanetScale ships.

## Cut over

1. `wrangler hyperdrive create nebutra-prod --connection-string="<admin url>"`.
2. Uncomment the `[[hyperdrive]]` block in `backends/gateway/wrangler.toml` and
   fill in the returned id. It ships commented out because `deploy-gateway.yml`
   fires automatically on a green CI, and an id naming a Hyperdrive config that
   does not exist yet would fail a deploy path that otherwise works.
   `src/worker.ts` already reads the binding and falls through to
   `DATABASE_URL` while it is absent, so nothing else has to change.
3. Set `DATABASE_URL` (application role) and `APP_DB_ROLE` on ECS Origin.
4. Push to main, or run the Deploy Gateway workflow by hand. It needs
   `DEPLOY_TARGET_GATEWAY=cloudflare-workers` (already set) plus the
   `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `SERVICE_SECRET` /
   `GATEWAY_SHARED_SECRET` secrets the workflow validates up front.
5. The new database starts empty, so the old Supabase project holds everything
   historical. Leave it running — this cutover has no rollback that recovers
   data written to the new database.

## Out of scope

- Personal portfolio `tsekaluk-dev` (separate repo) runs on its own Neon and is decoupled from this
  monorepo. It is not part of this migration.
- `packages/ops/supabase` (realtime client) is a provider option, not the data
  path. It keeps working against a Supabase project if one is still around,
  and is simply unused otherwise.
- ClickHouse (metering) and Upstash (queue/cache) are separate stores and are
  not affected.

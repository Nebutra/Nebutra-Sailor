# PlanetScale Support - Design

**Date:** 2026-07-06
**Status:** Implemented
**Goal:** Document PlanetScale support without overstating non-Postgres runtime compatibility.

---

## Decision

Nebutra-Sailor treats PlanetScale Postgres as a first-class managed PostgreSQL
provider alongside Neon and Supabase.

The supported path keeps the existing Postgres runtime contract:

- `datasource db.provider` remains `postgresql`.
- Runtime traffic uses `DATABASE_URL`.
- Prisma migrations use `DIRECT_URL`.
- Migration files remain checked in under `prisma/migrations/`.
- `db push` remains a local/prototype workflow, not the default migration path.

For PlanetScale Postgres, `DATABASE_URL` should point at the PgBouncer endpoint
on port `6432` with `sslmode=require`. `DIRECT_URL` should point at the direct
Postgres endpoint on port `5432` with `sslmode=require`.

---

## Runtime Contract

No application package needs a PlanetScale-specific fork for Postgres. The
existing Prisma/Postgres stack continues to own the database surface:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

The application still depends on PostgreSQL capabilities such as RLS and
`pgvector`. PlanetScale Postgres can fit this contract because it is a managed
PostgreSQL-compatible service with PgBouncer and supported extensions. Operators
must enable `pgvector` before the first migration if it is not already enabled
for the database.

PgBouncer is appropriate for OLTP runtime queries. Direct connections are
reserved for migrations, schema changes, introspection, backups, and other
long-running or DDL-heavy operations.

RLS usage must remain transaction-scoped. Nebutra's `withRls` helper sets tenant
context inside the transaction; new code should not rely on session variables
that survive across pooled transactions.

---

## Migration Contract

PlanetScale Postgres follows the same migration posture as other Postgres
providers:

- Generate versioned Prisma migrations from the Postgres schema.
- Commit generated migration SQL.
- Run migrations before deploying application code.
- Use the direct connection for DDL by setting `DIRECT_URL`.

This differs intentionally from the PlanetScale Vitess/MySQL Prisma workflow,
where provider docs commonly recommend branch/deploy-request flows and
`db push`. Sailor does not adopt that workflow for the core runtime because the
core schema is PostgreSQL-first.

---

## Future Template Path: PlanetScale Vitess/MySQL

PlanetScale Vitess/MySQL is not documented as a supported core runtime today.
It can become a future template path only with a separate database package or
preset that owns its differences explicitly:

- a MySQL/Vitess Prisma schema or generated schema variant
- a MySQL-compatible Prisma adapter strategy
- a `relationMode` decision, including whether foreign keys are enabled
- explicit indexes for relation scalar fields when using Prisma relation mode
- a migration and deploy-request workflow that does not conflict with checked-in
  Postgres migrations
- substitutions for Postgres-specific features, especially RLS and `pgvector`
- tests that prove the template does not silently drift from the core runtime

Until that work exists, docs should call the Vitess/MySQL path future/template
only and avoid implying that the existing Sailor runtime can be switched by
changing `DATABASE_URL`.

---

## Implementation Changes

The Sailor provider docs now:

- list PlanetScale Postgres with Neon and Supabase as supported managed
  PostgreSQL providers
- show pooled `DATABASE_URL` and direct `DIRECT_URL` examples for PlanetScale
  Postgres
- keep Prisma migrations on the Postgres provider with checked-in migrations
- describe PlanetScale Vitess/MySQL as a separate future/template path

The `create-sailor` database host registry also maps `--db-host=planetscale` to
PlanetScale Postgres. It now keeps the Prisma engine on `postgresql`, preserves
`DIRECT_URL` for migrations, and emits PlanetScale Postgres pooled/direct
placeholders instead of mutating the scaffold into a MySQL/Vitess shape.

No runtime code, Prisma schema, migrations, or generated Prisma client changed.
The core `@nebutra/db` package already connects through `@prisma/adapter-pg`
and `DATABASE_URL`, which is the correct runtime path for PlanetScale Postgres.

## References

- PlanetScale Postgres connection quickstart:
  `https://planetscale.com/docs/postgres/connecting/quickstart`
- PlanetScale Postgres connection overview:
  `https://planetscale.com/docs/postgres/connecting`
- PlanetScale Postgres extensions:
  `https://planetscale.com/docs/postgres/extensions`
- PlanetScale Postgres with Prisma:
  `https://planetscale.com/docs/postgres/tutorials/planetscale-postgres-prisma`

---

## Rollback

Rollback removes the PlanetScale Postgres provider docs, restores the previous
`create-sailor` PlanetScale host metadata, and deletes the PlanetScale support
architecture test. No database state, migration history, or generated Prisma
client is affected by this change.

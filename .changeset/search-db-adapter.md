---
"@nebutra/search": minor
---

The pgvector provider now accepts an optional `db` adapter (`config.db`, or `createSearch({ db })`) — a `PgvectorDbAdapter` (`getSystemDb`/`getTenantDb`) the host injects so search reaches Postgres through the host's own connection pool, tenant RLS session, and any preview/Hyperdrive routing, instead of a private connection this package opens itself. Tenant-scoped operations route through `db.getTenantDb(tenantId)`.

Omitting `db` keeps the previous behavior unchanged: the provider opens and owns its own `pg.Pool` from `connectionString` or `DATABASE_URL`. That path now logs a one-time deprecation warning and will be removed in a future major version — pass `db` instead.

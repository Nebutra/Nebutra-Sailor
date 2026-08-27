# @nebutra/audit — Migration Guide

The live `audit_logs` table is defined by the Prisma `AuditLog` model in
`packages/platform/db/prisma/schema.prisma` (already applied via migration
`20260316000000_audit_log_actor_outcome`). The Prisma schema is the source of
truth for column shape; the SQL in `prisma/migrations/init_audit_logs.sql` is a
**reference draft** describing the canonical SOC 2 / ISO 27001 invariants.

## Canonical invariants

1. **Append-only**: the application role MUST NOT have `UPDATE` or `DELETE`
   privileges on `audit_logs`. Retention and pruning run as a separate
   privileged role.
2. **Tenant-scoped**: every row carries `organization_id` (tenant), and RLS
   policies (owned by `@nebutra/tenant`) restrict reads/inserts to the
   request-scoped tenant context.
3. **Indexed for compliance queries**: `(tenant_id, timestamp DESC)`,
   `(actor_id, timestamp DESC)`, `(action, timestamp DESC)`.
4. **Retention**: minimum 1 year for SOC 2 alignment. Recommended 7 years for
   billing-related events.

## Applying the invariants

The Prisma schema already provides the columns and indexes. To enforce
append-only behavior on a new environment, run the following AFTER
`prisma migrate deploy`:

```sql
REVOKE UPDATE, DELETE ON audit_logs FROM <app_role>;
GRANT INSERT, SELECT ON audit_logs TO <app_role>;
```

RLS is owned by `@nebutra/tenant` — see `packages/iam/tenant/sql/rls_policies.sql`.

## Provider-specific notes

- **PostgresAuditProvider** (default): uses the Prisma `AuditLog` model.
- **ClickHouseAuditProvider**: optional, requires you to create the
  `audit_logs` table in your ClickHouse cluster. A starter DDL:

```sql
CREATE TABLE audit_logs (
  id              UUID,
  timestamp       DateTime64(3, 'UTC'),
  tenant_id       LowCardinality(String),
  actor_id        String,
  actor_type      LowCardinality(String),
  actor_email     Nullable(String),
  action          LowCardinality(String),
  resource_type   LowCardinality(String),
  resource_id     String,
  resource_name   Nullable(String),
  outcome         LowCardinality(String),
  severity        LowCardinality(String),
  ip              Nullable(String),
  user_agent      Nullable(String),
  request_id      Nullable(String),
  session_id      Nullable(String),
  changes_before  Nullable(String) CODEC(ZSTD(3)),
  changes_after   Nullable(String) CODEC(ZSTD(3)),
  metadata        Nullable(String) CODEC(ZSTD(3))
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, action)
TTL timestamp + INTERVAL 7 YEAR;
```

ClickHouse `MergeTree` tables are inherently append-friendly — there is no need
to revoke UPDATE/DELETE; `ALTER TABLE ... DELETE` is the only mutation primitive
and is reserved for the retention job.

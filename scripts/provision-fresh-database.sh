#!/usr/bin/env bash
#
# Stand up a brand-new platform database: schema, application role, RLS, and a
# self-check that tenant isolation actually bites.
#
#   scripts/provision-fresh-database.sh "postgresql://admin:…@host:5432/db"
#
# Safe to point at an empty database only. It refuses to run against one that
# already has tables, because the schema step is a from-empty diff and would
# collide rather than migrate.
#
# Why not `prisma migrate deploy`: prisma/migrations has no baseline — the
# earliest migration is 20260313000000_enable_rls, which ALTERs tables no
# migration ever creates. Replaying the folder onto an empty database dies on
# `relation "organizations" does not exist`. The schema of record is
# schema.prisma, so a from-empty diff is what actually builds a new database.
# The migrations folder stays meaningful only against databases that already
# have the pre-2026-03 baseline.

set -euo pipefail

DB_URL="${1:-}"
if [[ -z "$DB_URL" ]]; then
  echo "usage: $0 <admin-postgres-url>" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PKG="$REPO_ROOT/packages/platform/db"
RLS_SQL="$REPO_ROOT/infra/data/database/policies/rls.sql"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

APP_ROLE="${APP_DB_ROLE:-app_user}"
APP_PASSWORD="${APP_DB_PASSWORD:-}"
if [[ -z "$APP_PASSWORD" ]]; then
  echo "APP_DB_PASSWORD is not set. Generate one and export it — this becomes" >&2
  echo "the credential the application connects with." >&2
  exit 2
fi

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

say "Checking the target is empty"
EXISTING=$(psql "$DB_URL" -tA -c \
  "select count(*) from information_schema.tables where table_schema in ('public','better_auth')")
if [[ "$EXISTING" != "0" ]]; then
  echo "Target already has $EXISTING tables. This script only provisions empty databases." >&2
  exit 1
fi

say "Creating schemas and extensions"
# vector needs superuser on most managed providers; run this script with an
# admin role, not the application role it is about to create.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE SCHEMA IF NOT EXISTS better_auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
SQL

say "Generating schema from schema.prisma"
(cd "$DB_PKG" && npx prisma migrate diff \
  --from-empty --to-schema prisma/schema.prisma --script) > "$WORK/schema.sql"
echo "  $(grep -c 'CREATE TABLE' "$WORK/schema.sql") tables"

say "Applying schema"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$WORK/schema.sql"

say "Creating the application role"
# NOSUPERUSER + NOBYPASSRLS is not cosmetic: either attribute makes every RLS
# policy below a no-op, and tenant isolation silently stops existing.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q \
  -v role="$APP_ROLE" -v pw="$APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS',
              :'role', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role') \gexec
GRANT USAGE ON SCHEMA public, better_auth TO :"role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA better_auth TO :"role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"role";
SQL

say "Applying row-level security"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$RLS_SQL"
POLICIES=$(psql "$DB_URL" -tA -c "select count(*) from pg_policies where schemaname='public'")
echo "  $POLICIES policies"

say "Applying cost guardrails"
# Role-level, not call-site level: @nebutra/db sets statement_timeout inside
# getTenantDb, but a raw client or a future code path that forgets inherits
# nothing. Defaults on the role cover every session it opens.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -v role="$APP_ROLE" \
  -f "$REPO_ROOT/infra/data/database/policies/cost-guardrails.sql"

say "Verifying isolation as $APP_ROLE"
# Two tenants, one row each. Then read as the application role: scoped to a
# tenant it must see only that tenant, and with no tenant set it must see
# nothing. A non-zero count with no tenant means the policies did not attach or
# the role bypasses them — that is a data leak, not a warning.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO tenants(id, kind) VALUES ('__probe_a','ORGANIZATION'), ('__probe_b','ORGANIZATION')
  ON CONFLICT DO NOTHING;
-- Distinct key_hash per row: the column is UNIQUE, so identical values make
-- the second INSERT a no-op and leave exactly one tenant with data. The check
-- below would then pass trivially without ever proving that another tenant's
-- rows are hidden — which is the only thing it exists to prove.
INSERT INTO api_keys(id,name,key_hash,key_prefix,tenant_id,created_at,updated_at,rate_limit_rps)
VALUES ('__probe_ka','probe','__probe_hash_a','pa','__probe_a',now(),now(),1),
       ('__probe_kb','probe','__probe_hash_b','pb','__probe_b',now(),now(),1)
  ON CONFLICT DO NOTHING;
SQL

APP_URL=$(python3 - "$DB_URL" "$APP_ROLE" "$APP_PASSWORD" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
host = p.hostname or "localhost"
netloc = f"{u.quote(sys.argv[2])}:{u.quote(sys.argv[3], safe='')}@{host}"
if p.port:
    netloc += f":{p.port}"
print(u.urlunparse(p._replace(netloc=netloc)))
PY
)

FAIL=0
SCOPED=$(psql "$APP_URL" -tA -c \
  "BEGIN; SELECT set_config('app.current_tenant_id','__probe_a',true);
   SELECT string_agg(DISTINCT tenant_id,',') FROM api_keys; COMMIT;" | sed -n '3p')
UNSCOPED=$(psql "$APP_URL" -tA -c \
  "BEGIN; SELECT set_config('app.current_tenant_id','',true);
   SELECT count(*) FROM api_keys; COMMIT;" | sed -n '3p')

# Confirm the fixture itself is sound before trusting what it proves: two
# tenants must actually have rows, or "sees only its own" means nothing.
SEEDED=$(psql "$DB_URL" -tA -c \
  "SELECT count(DISTINCT tenant_id) FROM api_keys WHERE id LIKE '\\_\\_probe%'")
if [[ "$SEEDED" != "2" ]]; then
  echo "  fixture              → $SEEDED tenant(s) seeded, expected 2 ✗"; FAIL=1
else
  echo "  fixture              → 2 tenants seeded ✓"
fi
if [[ "$SCOPED" == "__probe_a" ]]; then
  echo "  scoped to a tenant  → sees only that tenant, not the other ✓"
else
  echo "  scoped to a tenant  → saw '$SCOPED', expected '__probe_a' ✗"; FAIL=1
fi
if [[ "$UNSCOPED" == "0" ]]; then
  echo "  no tenant set       → sees nothing ✓"
else
  echo "  no tenant set       → saw $UNSCOPED rows, expected 0 ✗"; FAIL=1
fi

psql "$DB_URL" -q -c \
  "DELETE FROM api_keys WHERE id LIKE '__probe_%'; DELETE FROM tenants WHERE id LIKE '__probe_%';"

if [[ "$FAIL" != "0" ]]; then
  echo
  echo "Isolation check FAILED. Do not point the application at this database." >&2
  exit 1
fi

say "Done"
cat <<EOF
Set these where the application runs:

  DATABASE_URL=$(printf '%s' "$APP_URL" | sed "s/:${APP_PASSWORD}@/:<password>@/")
  APP_DB_ROLE=$APP_ROLE

Then point Hyperdrive at the ADMIN url (Hyperdrive pools; the app still issues
SET LOCAL ROLE per transaction):

  wrangler hyperdrive create nebutra-prod --connection-string="<admin url>"
EOF

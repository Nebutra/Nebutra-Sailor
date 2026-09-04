#!/usr/bin/env bash
#
# Add the RLS-scoped `app_user` role to a database that ALREADY has schema and
# data — the companion to provision-fresh-database.sh, which refuses non-empty
# targets. Idempotent: safe to re-run.
#
#   scripts/provision-rls-role-existing-database.sh \
#     "postgresql://admin:…@host:5432/db"   \  # admin URL: CREATEROLE + can GRANT
#     "postgresql://current-app-role:…@host:5432/db"  # the CURRENT DATABASE_URL value
#
# What this does NOT do: change DATABASE_URL. The base connection keeps using
# whatever role it uses today. This only adds a lower-privilege role
# (NOSUPERUSER NOBYPASSRLS) that the code's `SET LOCAL ROLE "$APP_DB_ROLE"`
# (packages/iam/tenant/src/rls-session.ts) downgrades into per transaction —
# which requires the CURRENT connecting role to be a member of app_user, so
# this script also grants that membership. After this runs and the isolation
# self-check passes, the only production change needed is one env var:
# APP_DB_ROLE=app_user (see the closing instructions this script prints).
#
# Why NOSUPERUSER NOBYPASSRLS matters: either attribute makes every RLS policy
# in infra/data/database/policies/rls.sql a no-op for this role, silently.
#
# Why no FORCE ROW LEVEL SECURITY: RLS only needs FORCE to bind the TABLE
# OWNER — app_user is never the owner (the admin/migration role is), so the
# ENABLE-only policies in rls.sql already apply to it without FORCE.

set -euo pipefail

ADMIN_URL="${1:-}"
CURRENT_APP_URL="${2:-}"
if [[ -z "$ADMIN_URL" || -z "$CURRENT_APP_URL" ]]; then
  echo "usage: $0 <admin-postgres-url> <current-app-postgres-url>" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RLS_SQL="$REPO_ROOT/infra/data/database/policies/rls.sql"
GUARDRAILS_SQL="$REPO_ROOT/infra/data/database/policies/cost-guardrails.sql"

APP_ROLE="${APP_DB_ROLE:-app_user}"
APP_PASSWORD="${APP_DB_PASSWORD:-}"
if [[ -z "$APP_PASSWORD" ]]; then
  echo "APP_DB_PASSWORD is not set. Generate one and export it — this becomes" >&2
  echo "the role's login credential (not necessarily what DATABASE_URL uses)." >&2
  exit 2
fi

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

CURRENT_ROLE=$(python3 - "$CURRENT_APP_URL" <<'PY'
import sys, urllib.parse as u
print(u.urlparse(sys.argv[1]).username)
PY
)
if [[ -z "$CURRENT_ROLE" ]]; then
  echo "Could not extract a username from the current-app-postgres-url." >&2
  exit 2
fi
echo "Current application role (from DATABASE_URL): $CURRENT_ROLE"

say "Creating the application role (idempotent)"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q \
  -v role="$APP_ROLE" -v pw="$APP_PASSWORD" -v current="$CURRENT_ROLE" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS',
              :'role', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role') \gexec

-- Idempotent: keep the password current even if the role already existed.
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS', :'role', :'pw') \gexec

GRANT USAGE ON SCHEMA public, better_auth TO :"role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA better_auth TO :"role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA better_auth TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"role";

-- Required for the code's per-transaction `SET LOCAL ROLE "app_user"`
-- (packages/iam/tenant/src/rls-session.ts) to succeed: Postgres only lets a
-- role SET ROLE into one it is a member of.
SELECT format('GRANT %I TO %I', :'role', :'current') \gexec
SQL

say "Applying row-level security (idempotent: DROP POLICY IF EXISTS + CREATE POLICY)"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -f "$RLS_SQL"
POLICIES=$(psql "$ADMIN_URL" -tA -c "select count(*) from pg_policies where schemaname='public'")
echo "  $POLICIES policies"

say "Applying cost guardrails (idempotent)"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -v role="$APP_ROLE" -f "$GUARDRAILS_SQL"

APP_URL=$(python3 - "$ADMIN_URL" "$APP_ROLE" "$APP_PASSWORD" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
host = p.hostname or "localhost"
netloc = f"{u.quote(sys.argv[2])}:{u.quote(sys.argv[3], safe='')}@{host}"
if p.port:
    netloc += f":{p.port}"
print(u.urlunparse(p._replace(netloc=netloc)))
PY
)

say "Verifying isolation as $APP_ROLE (matches provision-fresh-database.sh's self-check)"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO tenants(id, kind) VALUES ('__probe_a','ORGANIZATION'), ('__probe_b','ORGANIZATION')
  ON CONFLICT DO NOTHING;
INSERT INTO api_keys(id,name,key_hash,key_prefix,tenant_id,created_at,updated_at,rate_limit_rps)
VALUES ('__probe_ka','probe','__probe_hash_a','pa','__probe_a',now(),now(),1),
       ('__probe_kb','probe','__probe_hash_b','pb','__probe_b',now(),now(),1)
  ON CONFLICT DO NOTHING;
SQL

FAIL=0
SCOPED=$(psql "$APP_URL" -tA -c \
  "BEGIN; SELECT set_config('app.current_tenant_id','__probe_a',true);
   SELECT string_agg(DISTINCT tenant_id,',') FROM api_keys; COMMIT;" | sed -n '3p')
UNSCOPED=$(psql "$APP_URL" -tA -c \
  "BEGIN; SELECT set_config('app.current_tenant_id','',true);
   SELECT count(*) FROM api_keys; COMMIT;" | sed -n '3p')

# Real production traffic exists already, so this must count ONLY the probe
# rows, not assert an exact total.
SEEDED=$(psql "$ADMIN_URL" -tA -c \
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

say "Confirming SET LOCAL ROLE from the current connecting role actually works"
SET_ROLE_OK=$(psql "$CURRENT_APP_URL" -tA -c \
  "BEGIN; SET LOCAL ROLE \"$APP_ROLE\"; SELECT current_user; COMMIT;" | tail -1)
if [[ "$SET_ROLE_OK" == "$APP_ROLE" ]]; then
  echo "  SET LOCAL ROLE \"$APP_ROLE\" from $CURRENT_ROLE → succeeded ✓"
else
  echo "  SET LOCAL ROLE \"$APP_ROLE\" from $CURRENT_ROLE → got '$SET_ROLE_OK' ✗"; FAIL=1
fi

psql "$ADMIN_URL" -q -c \
  "DELETE FROM api_keys WHERE id LIKE '__probe_%'; DELETE FROM tenants WHERE id LIKE '__probe_%';"

if [[ "$FAIL" != "0" ]]; then
  echo
  echo "Isolation check FAILED. Do not set APP_DB_ROLE in production yet." >&2
  exit 1
fi

say "Done"
cat <<EOF
DATABASE_URL is unchanged — the connection identity does not need to move.
Set only this where the application runs (e.g. \`fly secrets set\` on
whichever app hosts the gateway):

  APP_DB_ROLE=$APP_ROLE

Every tenant-scoped transaction will then SET LOCAL ROLE "$APP_ROLE" before
running, which is what actually turns the RLS policies from inert to
enforced. Confirm with: fly logs -a <app> | grep -i app_db_role
(should show nothing) after deploying.
EOF

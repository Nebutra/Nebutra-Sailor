#!/usr/bin/env bash
#
# Read-only audit of the things that turn into a database bill.
#
#   scripts/db-cost-audit.sh "postgresql://admin:…@host:5432/db"
#
# Touches nothing. Run it before you need it — the point is to notice a table
# growing without a retention policy while it is still small.

set -euo pipefail

DB_URL="${1:-}"
if [[ -z "$DB_URL" ]]; then
  echo "usage: $0 <admin-postgres-url>" >&2
  exit 2
fi

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

say "Total size"
psql "$DB_URL" -tA -c \
  "SELECT pg_size_pretty(pg_database_size(current_database()))" | sed 's/^/  /'

say "Largest tables"
psql "$DB_URL" -c "
SELECT c.relname AS table,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
       s.n_live_tup AS live_rows,
       s.n_dead_tup AS dead_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname IN ('public','better_auth') AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 15;"

# Dead rows that autovacuum has not reclaimed are storage you pay for twice:
# once for the bloat, and again in the I/O to scan past it. A high ratio here
# usually means a long-running transaction is holding a snapshot open.
say "Bloat — dead rows autovacuum has not reclaimed"
psql "$DB_URL" -c "
SELECT relname AS table, n_live_tup AS live, n_dead_tup AS dead,
       CASE WHEN n_live_tup > 0
            THEN round(100.0 * n_dead_tup / n_live_tup, 1) END AS pct_dead,
       last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;"

# The single most expensive failure mode: a session idle inside a transaction
# blocks autovacuum database-wide, so storage grows and never comes back.
say "Sessions idle in a transaction (should be empty)"
psql "$DB_URL" -c "
SELECT pid, usename, state, now() - state_change AS held_for,
       left(query, 60) AS last_query
FROM pg_stat_activity
WHERE state IN ('idle in transaction','idle in transaction (aborted)')
ORDER BY state_change
LIMIT 10;"

say "Connections in use"
psql "$DB_URL" -c "
SELECT usename, state, count(*)
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY 1, 2 ORDER BY 3 DESC;"

say "Append-only tables with no retention policy"
# These grow monotonically by design. None of them has a purge job in this
# repo, so each one is an open-ended storage commitment until someone decides
# a retention window. Listed with age so the decision can be informed.
psql "$DB_URL" -c "
SELECT c.relname AS table,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
       s.n_live_tup AS rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname ~ '(_logs?|_events?|_runs?|_ledger_entries|_sessions)$'
ORDER BY pg_total_relation_size(c.oid) DESC;"

say "Guardrails currently in force"
psql "$DB_URL" -c "
SELECT rolname AS role, rolconnlimit AS conn_limit, rolconfig AS defaults
FROM pg_roles
WHERE rolcanlogin AND rolname NOT LIKE 'pg\\_%'
ORDER BY rolname;"

cat <<'EOF'

Reading this:
  · A role with empty `defaults` has no statement_timeout — apply
    infra/data/database/policies/cost-guardrails.sql.
  · Anything in "idle in a transaction" for more than a minute is actively
    preventing vacuum across the whole database. Find the caller.
  · An append-only table growing steadily needs a retention decision. Deleting
    is irreversible, so that call is not made here.
EOF

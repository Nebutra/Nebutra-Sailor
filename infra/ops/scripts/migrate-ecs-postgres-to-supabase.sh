#!/usr/bin/env bash
set -euo pipefail

# Migrates Nebutra's ECS-hosted PostgreSQL database into Supabase PostgreSQL.
#
# Required env:
#   SOURCE_DATABASE_URL      Current ECS Postgres URL.
#   SUPABASE_DIRECT_URL      Supabase direct database URL for restore/migrations.
#
# Optional env:
#   SUPABASE_DATABASE_URL    Supabase pooled runtime URL; only printed in summary.
#   MIGRATION_DIR            Work directory; default /tmp/nebutra-supabase-migration-<timestamp>.
#   DUMP_JOBS                Parallel pg_dump jobs; default 4.
#   RESTORE_JOBS             Parallel pg_restore jobs; default 4.
#   SCHEMAS                  Schemas to migrate; default "public auth".
#
# Modes:
#   dump      Dump SOURCE_DATABASE_URL and write counts.
#   restore   Prepare Supabase target, restore the dump, and write counts.
#   verify    Compare source/target counts from the migration directory.
#   all       Run dump, restore, and verify.

MODE="${1:-all}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MIGRATION_DIR="${MIGRATION_DIR:-/tmp/nebutra-supabase-migration-$TIMESTAMP}"
DUMP_DIR="$MIGRATION_DIR/dump"
SOURCE_COUNTS="$MIGRATION_DIR/source-counts.tsv"
TARGET_COUNTS="$MIGRATION_DIR/target-counts.tsv"
RESTORE_LIST="$MIGRATION_DIR/restore.list"
SCHEMAS="${SCHEMAS:-public auth}"
DUMP_JOBS="${DUMP_JOBS:-4}"
RESTORE_JOBS="${RESTORE_JOBS:-4}"

log() {
  printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"
}

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_commands() {
  for cmd in pg_dump pg_restore psql diff grep sed; do
    command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
  done
}

require_source() {
  [ -n "${SOURCE_DATABASE_URL:-}" ] || fail "SOURCE_DATABASE_URL is required"
}

require_target() {
  [ -n "${SUPABASE_DIRECT_URL:-}" ] || fail "SUPABASE_DIRECT_URL is required"
}

schema_args() {
  for schema in $SCHEMAS; do
    printf -- '--schema=%s\n' "$schema"
  done
}

write_counts() {
  local database_url="$1"
  local output_file="$2"
  local schema_list=""
  local schema

  for schema in $SCHEMAS; do
    schema_list="${schema_list}${schema_list:+,}'${schema}'"
  done

  psql "$database_url" -v ON_ERROR_STOP=1 -AtF $'\t' <<SQL | sort > "$output_file"
WITH tables AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS fq_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname IN ($schema_list)
)
SELECT
  schema_name || '.' || table_name,
  (
    xpath(
      '/row/count/text()',
      query_to_xml(format('SELECT count(*) AS count FROM %s', fq_name), false, true, '')
    )
  )[1]::text::bigint
FROM tables
ORDER BY 1;
SQL
}

prepare_target() {
  log "preparing Supabase target extensions and schemas"
  psql "$SUPABASE_DIRECT_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
SQL
}

dump_source() {
  require_source
  mkdir -p "$MIGRATION_DIR"
  rm -rf "$DUMP_DIR"

  log "writing source row counts to $SOURCE_COUNTS"
  write_counts "$SOURCE_DATABASE_URL" "$SOURCE_COUNTS"

  log "dumping schemas: $SCHEMAS"
  # shellcheck disable=SC2046
  pg_dump "$SOURCE_DATABASE_URL" \
    --format=directory \
    --jobs="$DUMP_JOBS" \
    --no-owner \
    --no-privileges \
    --file="$DUMP_DIR" \
    $(schema_args)

  log "dump complete: $DUMP_DIR"
}

filter_restore_list() {
  pg_restore --list "$DUMP_DIR" \
    | grep -Ev ' SCHEMA - (public|auth) ' \
    | grep -Ev ' EXTENSION - (vector|uuid-ossp) ' \
    | grep -Ev ' COMMENT - (EXTENSION|SCHEMA) ' \
    | grep -Ev ' ACL - (SCHEMA|EXTENSION) ' \
    > "$RESTORE_LIST"
}

restore_target() {
  require_target
  [ -d "$DUMP_DIR" ] || fail "dump directory does not exist: $DUMP_DIR"

  prepare_target
  filter_restore_list

  log "restoring dump into Supabase target"
  pg_restore \
    --dbname="$SUPABASE_DIRECT_URL" \
    --jobs="$RESTORE_JOBS" \
    --no-owner \
    --no-privileges \
    --use-list="$RESTORE_LIST" \
    "$DUMP_DIR"

  log "writing target row counts to $TARGET_COUNTS"
  write_counts "$SUPABASE_DIRECT_URL" "$TARGET_COUNTS"
}

verify_counts() {
  [ -f "$SOURCE_COUNTS" ] || fail "missing source counts: $SOURCE_COUNTS"
  [ -f "$TARGET_COUNTS" ] || fail "missing target counts: $TARGET_COUNTS"

  log "comparing row counts"
  diff -u "$SOURCE_COUNTS" "$TARGET_COUNTS"
  log "row counts match"
}

print_summary() {
  log "migration artifacts: $MIGRATION_DIR"
  if [ -n "${SUPABASE_DATABASE_URL:-}" ]; then
    log "use SUPABASE_DATABASE_URL as ECS runtime DATABASE_URL after cutover"
  fi
}

main() {
  require_commands
  case "$MODE" in
    dump)
      dump_source
      ;;
    restore)
      restore_target
      ;;
    verify)
      verify_counts
      ;;
    all)
      dump_source
      restore_target
      verify_counts
      ;;
    *)
      fail "unknown mode: $MODE (expected dump, restore, verify, all)"
      ;;
  esac
  print_summary
}

main "$@"

#!/usr/bin/env bash
# Remote-side helper for the ECS deploy workflow.
#
# Invoked over SSH by .github/workflows/deploy-ecs.yml after bundles have been
# uploaded to /tmp on the ECS box. Unpacks each bundle into a timestamped
# release directory, atomically swaps the `current` symlink, and reloads PM2.
#
# Inputs (env vars):
#   DEPLOY_ROOT   — base directory (default /var/www/nebutra)
#   APPS          — space-separated list of apps to deploy (landing web api)
#   KEEP_RELEASES — number of past releases to retain (default 5)
#   PM2_CONFIG    — absolute path to ecosystem.config.cjs that should be loaded
#                   on first run; subsequent runs use `pm2 reload` for zero downtime.
#
# Tarball naming convention (uploaded by the workflow to /tmp):
#   /tmp/nebutra-<app>-<sha>.tar.gz
#
# Exits non-zero on any failure so the GH Actions step fails loudly.

set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/nebutra}"
APPS="${APPS:-landing web api}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
PM2_CONFIG="${PM2_CONFIG:-$DEPLOY_ROOT/ecosystem.config.cjs}"
SHA="${SHA:?SHA env var required}"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "::error:: $*" >&2; exit 1; }

case "$APPS" in
  *landing*|*web*|*api*) : ;;
  *) fail "APPS must contain at least one of: landing web api (got: $APPS)" ;;
esac

mkdir -p "$DEPLOY_ROOT"

deploy_one() {
  local app="$1" pm2_name="$2"
  local tarball="/tmp/nebutra-${app}-${SHA}.tar.gz"
  if [ ! -f "$tarball" ]; then
    log "skip $app — no tarball at $tarball"
    return 0
  fi

  local app_root="$DEPLOY_ROOT/$app"
  local releases="$app_root/releases"
  local stamp
  stamp="$(date -u +%Y%m%d-%H%M%S)-${SHA:0:7}"
  local release="$releases/$stamp"

  mkdir -p "$release"
  log "extract $tarball -> $release"
  tar -xzf "$tarball" -C "$release"

  ln -snf "$release" "$app_root/current"
  log "$app current -> $release"

  rm -f "$tarball"

  log "reload pm2 process: $pm2_name"
  if pm2 describe "$pm2_name" >/dev/null 2>&1; then
    pm2 reload "$pm2_name" --update-env
  else
    log "pm2 process $pm2_name not registered yet — running ecosystem"
    pm2 start "$PM2_CONFIG" --only "$pm2_name"
  fi

  # Retention — keep latest N, drop the rest. find sorts by mtime via -printf
  # to avoid SC2012 issues with `ls`. Release names are timestamped so this is
  # equivalent to lexical sort.
  if [ "$KEEP_RELEASES" -gt 0 ]; then
    local extra
    extra=$(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
              | sort -nr | tail -n +"$((KEEP_RELEASES + 1))" | cut -d' ' -f2- || true)
    if [ -n "$extra" ]; then
      log "pruning old releases:"
      echo "$extra" | xargs -r rm -rf
    fi
  fi
}

for app in $APPS; do
  case "$app" in
    landing) deploy_one landing landing-page ;;
    web)     deploy_one web     web         ;;
    api)     deploy_one api     api-gateway ;;
    *)       fail "unknown app: $app"       ;;
  esac
done

pm2 save
log "deploy complete: $APPS @ $SHA"

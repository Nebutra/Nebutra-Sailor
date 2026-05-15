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
APPS="${APPS:-landing web api design-docs}"
# Default 1 (was 2 since the May 12 disk-full incident reduced it from 5).
# Cut to 1 on 2026-05-15 when design-docs joined as the 4th ECS app — at 4
# apps × ~1 GB/release × 2 releases the 2C4G Aliyun Lite disk fills again.
# Override per-deploy with the ECS_KEEP_RELEASES repository variable if you
# need rollback depth on a specific deploy.
KEEP_RELEASES="${KEEP_RELEASES:-1}"
PM2_CONFIG="${PM2_CONFIG:-$DEPLOY_ROOT/ecosystem.config.cjs}"
SHA="${SHA:?SHA env var required}"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "::error:: $*" >&2; exit 1; }

case "$APPS" in
  *landing*|*web*|*api*|*design-docs*) : ;;
  *) fail "APPS must contain at least one of: landing web api design-docs (got: $APPS)" ;;
esac

mkdir -p "$DEPLOY_ROOT"

# Clean stale bundles from prior failed runs so /tmp doesn't fill the disk.
# Anything not matching the current SHA is from a previous run; safe to drop.
find /tmp -maxdepth 1 -name 'nebutra-*.tar.gz' \
     ! -name "nebutra-*-${SHA}.tar.gz" -mtime +0 -delete 2>/dev/null || true

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

  # PRE-EXTRACTION CLEANUP: drop old releases BEFORE we try to write the new
  # one. The post-extraction prune at the bottom of this function only fires
  # AFTER tar succeeds, so when the box is already at disk-pressure (this app
  # alone is ~1 GB/release × KEEP_RELEASES) the new tar errors out with
  # "No space left on device" and the deploy never lands. Pruning here keeps
  # the latest (KEEP_RELEASES - 1) so the incoming release becomes Nth.
  if [ "$KEEP_RELEASES" -gt 0 ] && [ -d "$releases" ]; then
    local pre_keep=$((KEEP_RELEASES - 1))
    [ "$pre_keep" -lt 1 ] && pre_keep=1
    local pre_extra
    pre_extra=$(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
                  | sort -nr | tail -n +"$((pre_keep + 1))" | cut -d' ' -f2- || true)
    if [ -n "$pre_extra" ]; then
      log "pre-extract prune (keeping $pre_keep older releases):"
      echo "$pre_extra" | xargs -r rm -rf
    fi
  fi

  # Also reclaim any free space hiding in /tmp from earlier failed runs.
  find /tmp -maxdepth 1 -name 'nebutra-*.tar.gz' \
       ! -name "nebutra-${app}-${SHA}.tar.gz" -mmin +5 -delete 2>/dev/null || true

  mkdir -p "$release"
  log "extract $tarball -> $release"
  tar -xzf "$tarball" -C "$release"

  ln -snf "$release" "$app_root/current"
  log "$app current -> $release"

  rm -f "$tarball"

  # Decide between zero-downtime reload and force-recreate.
  #
  # `pm2 reload` keeps the existing in-memory config (cwd, script path, env)
  # and only reloads code from disk. That is fine for incremental deploys, but
  # it cannot pick up a NEW cwd or script path from ecosystem.config.cjs — for
  # that we have to delete and start fresh.
  #
  # Strategy: if the running process's cwd is already under our managed
  # release tree, do a zero-downtime reload. Otherwise (first-time migration,
  # or someone manually started it elsewhere), force-recreate from the
  # ecosystem so cwd/script match the new layout.
  local pm_cwd=""
  if pm2 describe "$pm2_name" >/dev/null 2>&1; then
    if command -v jq >/dev/null 2>&1; then
      pm_cwd=$(pm2 jlist 2>/dev/null \
                | jq -r ".[] | select(.name==\"$pm2_name\") | .pm2_env.pm_cwd // empty" \
                || echo "")
    elif command -v python3 >/dev/null 2>&1; then
      pm_cwd=$(pm2 jlist 2>/dev/null | python3 -c '
import json, sys
try:
    procs = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for p in procs:
    if p.get("name") == sys.argv[1]:
        print(p.get("pm2_env", {}).get("pm_cwd", ""))
        break
' "$pm2_name" 2>/dev/null || echo "")
    fi
  fi

  # `pm2 reload` is zero-downtime BUT keeps the resolved cwd from the
  # process's original start — it does NOT re-read the `current` symlink.
  # That's a problem because the pre-extract prune at the top of this
  # function can delete the old release directory that pm2 is still pointing
  # at. After symlink swap + reload, Node ends up trying to resolve modules
  # (e.g. `tsx`, `@nebutra/*` workspace deps) from a path that no longer
  # exists → ERR_MODULE_NOT_FOUND at startup.
  #
  # Only reload when ALL of these hold:
  #   1. pm2 was already running this process
  #   2. its cwd is under our managed app root
  #   3. that cwd directory still exists on disk
  #   4. it dereferences to the SAME path as the current `current` symlink
  #
  # Otherwise force-recreate so pm2 re-reads the ecosystem (which uses
  # `cwd: <app>/current`) and lands on the freshly-swapped release.
  local current_target=""
  if [ -L "$app_root/current" ]; then
    current_target="$(readlink -f "$app_root/current" 2>/dev/null || true)"
  fi
  local can_reload="no"
  if [ -n "$pm_cwd" ] && [[ "$pm_cwd" == "$app_root/"* ]] && [ -d "$pm_cwd" ]; then
    if [ -n "$current_target" ] && [ "$pm_cwd" = "$current_target" ]; then
      can_reload="yes"
    fi
  fi

  if [ "$can_reload" = "yes" ]; then
    log "reload pm2 $pm2_name (cwd=$pm_cwd, zero-downtime)"
    pm2 reload "$pm2_name" --update-env
  else
    if [ -n "$pm_cwd" ]; then
      if [ ! -d "$pm_cwd" ]; then
        log "pm2 $pm2_name cwd=$pm_cwd no longer exists (prior release pruned) — force-recreating"
      elif [ "$pm_cwd" != "$current_target" ]; then
        log "pm2 $pm2_name cwd=$pm_cwd does not match current → $current_target — force-recreating"
      else
        log "pm2 $pm2_name has cwd=$pm_cwd, not under $app_root — force-recreating"
      fi
    else
      log "pm2 process $pm2_name not registered — starting from ecosystem"
    fi
    pm2 delete "$pm2_name" >/dev/null 2>&1 || true
    pm2 start "$PM2_CONFIG" --only "$pm2_name"
  fi

  # Surface PM2 status + recent logs so CI can see crash reasons. Without
  # this, deploys that succeed at the SSH level but crash at startup return
  # exit 0 here and only fail later in the workflow's HTTP smoke test —
  # without any clue why.
  log "pm2 status for $pm2_name (post start/reload):"
  pm2 list --no-color 2>&1 | grep -E "$pm2_name|App name" || true
  log "pm2 logs for $pm2_name (last 40 lines, no stream):"
  pm2 logs "$pm2_name" --nostream --lines 40 --raw --no-color 2>&1 | tail -50 || true

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
    landing)     deploy_one landing     landing-page ;;
    web)         deploy_one web         web          ;;
    api)         deploy_one api         api-gateway  ;;
    design-docs) deploy_one design-docs design-docs  ;;
    *)           fail "unknown app: $app"            ;;
  esac
done

pm2 save
log "deploy complete: $APPS @ $SHA"

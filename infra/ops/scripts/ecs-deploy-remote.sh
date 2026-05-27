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
APPS="${APPS:-landing web api design-docs sailor-docs}"
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
  *landing*|*web*|*api*|*design-docs*|*sailor-docs*) : ;;
  *) fail "APPS must contain at least one of: landing web api design-docs sailor-docs (got: $APPS)" ;;
esac

mkdir -p "$DEPLOY_ROOT"

# Clean stale bundles from prior failed runs so /tmp doesn't fill the disk.
# Anything not matching the current SHA is from a previous run; safe to drop.
find /tmp -maxdepth 1 -name 'nebutra-*.tar.gz' \
     ! -name "nebutra-*-${SHA}.tar.gz" -mtime +0 -delete 2>/dev/null || true

preserve_runtime_env() {
  local app_root="$1" release="$2"
  local previous_env="$app_root/current/.env"
  local release_env="$release/.env"

  if [ -f "$previous_env" ] && [ ! -f "$release_env" ]; then
    cp -p "$previous_env" "$release_env"
    log "preserved runtime env: $previous_env -> $release_env"
  fi
}

source_runtime_env_file() {
  local env_file="$1"

  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
}

generate_runtime_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
  else
    echo "$(date -u +%s%N)-runtime-secret"
  fi
}

append_env_assignment() {
  local env_file="$1" key="$2" value="$3"
  [ -n "$value" ] || return 0
  printf '%s=' "$key" >> "$env_file"
  printf '%q' "$value" >> "$env_file"
  printf '\n' >> "$env_file"
}

ensure_env_assignment() {
  local env_file="$1" key="$2" value="$3"
  [ -n "$value" ] || return 0
  if [ -f "$env_file" ] && grep -qE "^${key}=" "$env_file"; then
    return 0
  fi
  append_env_assignment "$env_file" "$key" "$value"
}

bootstrap_web_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local api_env="$DEPLOY_ROOT/api/.env"

  if [ -f "$api_env" ]; then
    source_runtime_env_file "$api_env"
  fi

  if [ -z "${DATABASE_URL:-}" ]; then
    DATABASE_URL="$(discover_local_postgres_url || true)"
    export DATABASE_URL
  fi

  AUTH_PROVIDER="${AUTH_PROVIDER:-better-auth}"
  NEXT_PUBLIC_AUTH_PROVIDER="${NEXT_PUBLIC_AUTH_PROVIDER:-$AUTH_PROVIDER}"
  BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(generate_runtime_secret)}"
  BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://app.nebutra.com}"
  NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://app.nebutra.com}"
  NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://app.nebutra.com}"
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.nebutra.com}"
  NEXT_PUBLIC_API_GATEWAY_URL="${NEXT_PUBLIC_API_GATEWAY_URL:-https://api.nebutra.com}"
  NEBUTRA_LANDING_ORIGIN="${NEBUTRA_LANDING_ORIGIN:-https://nebutra.com}"
  NEBUTRA_SESSION_HINT_DOMAIN="${NEBUTRA_SESSION_HINT_DOMAIN:-.nebutra.com}"

  export AUTH_PROVIDER NEXT_PUBLIC_AUTH_PROVIDER BETTER_AUTH_SECRET BETTER_AUTH_URL
  export NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_APP_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_API_GATEWAY_URL
  export NEBUTRA_LANDING_ORIGIN NEBUTRA_SESSION_HINT_DOMAIN

  local missing=()
  [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
  [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
  if [ "${AUTH_PROVIDER:-}" = "better-auth" ]; then
    [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
  fi
  if [ "${#missing[@]}" -gt 0 ]; then
    fail "web runtime env missing required keys after bootstrap: ${missing[*]}"
  fi

  mkdir -p "$app_root"
  touch "$env_file"
  chmod 600 "$env_file"
  ensure_env_assignment "$env_file" NODE_ENV "production"
  ensure_env_assignment "$env_file" PORT "3000"
  ensure_env_assignment "$env_file" HOSTNAME "127.0.0.1"
  ensure_env_assignment "$env_file" DATABASE_URL "$DATABASE_URL"
  ensure_env_assignment "$env_file" AUTH_PROVIDER "$AUTH_PROVIDER"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_AUTH_PROVIDER "$NEXT_PUBLIC_AUTH_PROVIDER"
  ensure_env_assignment "$env_file" BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"
  ensure_env_assignment "$env_file" BETTER_AUTH_URL "$BETTER_AUTH_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_API_URL "$NEXT_PUBLIC_API_URL"
  ensure_env_assignment "$env_file" NEXT_PUBLIC_API_GATEWAY_URL "$NEXT_PUBLIC_API_GATEWAY_URL"
  ensure_env_assignment "$env_file" NEBUTRA_LANDING_ORIGIN "$NEBUTRA_LANDING_ORIGIN"
  ensure_env_assignment "$env_file" NEBUTRA_SESSION_HINT_DOMAIN "$NEBUTRA_SESSION_HINT_DOMAIN"
  chmod 600 "$env_file"
  log "ensured web runtime env: $env_file"
}

load_runtime_env() {
  local app="$1" release="$2" pm2_name="$3"
  local app_root="$DEPLOY_ROOT/$app"
  local loaded=""
  local env_file
  local candidates=(
    "$DEPLOY_ROOT/.env"
    "$DEPLOY_ROOT/.env.production"
    "$DEPLOY_ROOT/web/current/.env"
    "$app_root/.env"
    "$app_root/current/.env"
    "$release/.env"
  )

  for env_file in "${candidates[@]}"; do
    if [ -f "$env_file" ]; then
      source_runtime_env_file "$env_file"
      loaded="${loaded}${loaded:+, }$env_file"
    fi
  done

  if [ -n "$loaded" ]; then
    log "loaded runtime env for $app: $loaded"
  else
    log "no runtime env files found for $app"
  fi

  if [ "$app" = "web" ]; then
    if [ ! -f "$app_root/.env" ]; then
      bootstrap_web_runtime_env "$app_root"
      source_runtime_env_file "$app_root/.env"
    fi

    local missing=()
    [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
    [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
    if [ "${AUTH_PROVIDER:-better-auth}" = "better-auth" ]; then
      [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
    fi
    if [ "${#missing[@]}" -gt 0 ]; then
      load_existing_pm2_env "$pm2_name"
      missing=()
      [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
      [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
      if [ "${AUTH_PROVIDER:-better-auth}" = "better-auth" ]; then
        [ -n "${BETTER_AUTH_SECRET:-}" ] || missing+=("BETTER_AUTH_SECRET")
      fi
      if [ "${#missing[@]}" -gt 0 ]; then
        bootstrap_web_runtime_env "$app_root"
        source_runtime_env_file "$app_root/.env"
      fi
    fi
  fi

  if [ "$app" = "api" ]; then
    local missing=()
    [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
    [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
    if [ "${#missing[@]}" -gt 0 ]; then
      load_existing_pm2_env "$pm2_name"
      missing=()
      [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
      [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
      if [ "${#missing[@]}" -gt 0 ]; then
        bootstrap_api_runtime_env "$app_root"
        source_runtime_env_file "$app_root/.env"
        missing=()
        [ -n "${DATABASE_URL:-}" ] || missing+=("DATABASE_URL")
        [ -n "${AUTH_PROVIDER:-}" ] || missing+=("AUTH_PROVIDER")
      fi
      if [ "${#missing[@]}" -gt 0 ]; then
        fail "api runtime env missing required keys after env load: ${missing[*]}"
      fi
    fi

    refresh_bootstrapped_api_database_url "$app_root"
  fi
}

refresh_bootstrapped_api_database_url() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local discovered_url=""

  if [ -n "${DATABASE_URL:-}" ] &&
     [[ "$DATABASE_URL" != "postgresql://postgres:postgres@127.0.0.1:5432/nebutra"* ]]; then
    return 0
  fi

  discovered_url="$(discover_local_postgres_url || true)"
  if [ -z "$discovered_url" ]; then
    return 0
  fi

  export DATABASE_URL="$discovered_url"

  if [ -f "$env_file" ]; then
    local tmp
    tmp="$(mktemp)"
    awk -v url="$discovered_url" '
      BEGIN { replaced = 0 }
      /^DATABASE_URL=/ {
        print "DATABASE_URL=" url
        replaced = 1
        next
      }
      { print }
      END {
        if (replaced == 0) {
          print "DATABASE_URL=" url
        }
      }
    ' "$env_file" > "$tmp"
    cat "$tmp" > "$env_file"
    rm -f "$tmp"
    chmod 600 "$env_file"
  fi

  log "refreshed bootstrapped api DATABASE_URL from local postgres container"
}

discover_local_postgres_url() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi

  local container password database
  for container in nebutra-postgres-lite nebutra-postgres postgres; do
    if ! docker inspect "$container" >/dev/null 2>&1; then
      continue
    fi

    password="$(docker inspect "$container" \
      --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
      | awk -F= '$1 == "POSTGRES_PASSWORD" { print substr($0, length($1) + 2); exit }')"
    database="$(docker inspect "$container" \
      --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
      | awk -F= '$1 == "POSTGRES_DB" { print substr($0, length($1) + 2); exit }')"

    if [ -n "$password" ]; then
      database="${database:-nebutra}"
      if command -v python3 >/dev/null 2>&1; then
        python3 - "$password" "$database" <<'PY'
import sys
from urllib.parse import quote

password = quote(sys.argv[1], safe="")
database = quote(sys.argv[2], safe="")
print(f"postgresql://postgres:{password}@127.0.0.1:5432/{database}?schema=public")
PY
      else
        echo "postgresql://postgres:${password}@127.0.0.1:5432/${database}?schema=public"
      fi
      return 0
    fi
  done
}

bootstrap_api_runtime_env() {
  local app_root="$1"
  local env_file="$app_root/.env"
  local secret=""

  if [ -f "$env_file" ]; then
    return 0
  fi

  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -hex 32)"
  elif command -v python3 >/dev/null 2>&1; then
    secret="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  else
    secret="$(date -u +%s%N)-api-bootstrap-secret"
  fi

  mkdir -p "$app_root"
  umask 077
  cat > "$env_file" <<EOF
NODE_ENV=production
PORT=3002
HOSTNAME=127.0.0.1
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/nebutra?schema=public
AUTH_PROVIDER=better-auth
NEXT_PUBLIC_AUTH_PROVIDER=better-auth
BETTER_AUTH_SECRET=$secret
EOF
  chmod 600 "$env_file"
  log "bootstrapped minimal api runtime env: $env_file"
}

load_existing_pm2_env() {
  local pm2_name="$1"

  if ! pm2 describe "$pm2_name" >/dev/null 2>&1; then
    return 0
  fi

  local count=0
  local line key value
  local pm2_env_lines=""

  if command -v jq >/dev/null 2>&1; then
    pm2_env_lines=$(pm2 jlist 2>/dev/null \
      | jq -r --arg name "$pm2_name" '
          .[]
          | select(.name == $name)
          | .pm2_env
          | to_entries[]
          | select(.value | type == "string" or type == "number" or type == "boolean")
          | select(.key | test("^(DATABASE_URL|AUTH_PROVIDER|CLERK_|BETTER_AUTH_|SUPABASE_|STRIPE_|OPENAI_|NEXT_PUBLIC_|REDIS_|RESEND_|SENTRY_|SANITY_|JWT_|COOKIE_|APP_|API_)"))
          | "\(.key)=\(.value | tostring)"
        ' || true)
  elif command -v python3 >/dev/null 2>&1; then
    pm2_env_lines=$(pm2 jlist 2>/dev/null | python3 - "$pm2_name" <<'PY' || true
import json
import re
import sys

name = sys.argv[1]
allow = re.compile(
    r"^(DATABASE_URL|AUTH_PROVIDER|CLERK_|BETTER_AUTH_|SUPABASE_|STRIPE_|OPENAI_|"
    r"NEXT_PUBLIC_|REDIS_|RESEND_|SENTRY_|SANITY_|JWT_|COOKIE_|APP_|API_)"
)

try:
    procs = json.load(sys.stdin)
except Exception:
    sys.exit(0)

for proc in procs:
    if proc.get("name") != name:
        continue
    for key, value in proc.get("pm2_env", {}).items():
        if not allow.match(key):
            continue
        if isinstance(value, (str, int, float, bool)):
            print(f"{key}={value}")
    break
PY
)
  else
    log "cannot inherit runtime env from pm2 $pm2_name: jq/python3 not installed"
    return 0
  fi

  while IFS= read -r line; do
    key="${line%%=*}"
    value="${line#*=}"
    if [ -n "$key" ] && [ "$key" != "$line" ]; then
      export "$key=$value"
      count=$((count + 1))
    fi
  done <<< "$pm2_env_lines"

  if [ "$count" -gt 0 ]; then
    log "inherited $count runtime env keys from existing pm2 $pm2_name"
  else
    log "no inheritable runtime env keys found in existing pm2 $pm2_name"
  fi
}

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

  preserve_runtime_env "$app_root" "$release"
  ln -snf "$release" "$app_root/current"
  log "$app current -> $release"

  rm -f "$tarball"
  load_runtime_env "$app" "$release" "$pm2_name"

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

  if [ "$pm2_name" = "api-gateway" ]; then
    log "wait for api-gateway local health"
    local code="000"
    for attempt in 1 2 3 4 5 6 7 8 9 10; do
      code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 \
        "http://127.0.0.1:3002/api/misc/health" 2>/dev/null || echo "000")
      if [ "$code" = "200" ]; then
        log "api-gateway local health -> $code"
        break
      fi
      if [ "$attempt" -eq 10 ]; then
        log "api-gateway local health failed after $attempt attempts (last code: $code)"
        pm2 describe "$pm2_name" --no-color 2>&1 || true
        pm2 logs "$pm2_name" --nostream --lines 160 --raw --no-color 2>&1 | tail -180 || true
        fail "api-gateway failed local health check"
      fi
      sleep 6
    done
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

for app in api landing web design-docs sailor-docs; do
  case " $APPS " in
    *" $app "*) : ;;
    *) continue ;;
  esac

  case "$app" in
    landing)     deploy_one landing     landing-page ;;
    web)         deploy_one web         web          ;;
    api)         deploy_one api         api-gateway  ;;
    design-docs) deploy_one design-docs design-docs  ;;
    sailor-docs) deploy_one sailor-docs sailor-docs  ;;
    *)           fail "unknown app: $app"            ;;
  esac
done

pm2 save
log "deploy complete: $APPS @ $SHA"

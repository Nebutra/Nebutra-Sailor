#!/usr/bin/env bash
# Deploy Carina product docs (static Astro) to ECS for carina.nebutra.com.
#
# Topology (owner 2026-07-30): DNS A → 106.15.4.31 (CF proxied), same as pebble.
# Without an active nginx server_name, Host falls through to default 443 → 301 apex.
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@106.15.4.31}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/var/www/nebutra/carina}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d%H%M%S)}"
DEPLOY_NGINX_CONF="${DEPLOY_NGINX_CONF:-1}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NGINX_CONF="$ROOT_DIR/infra/runtime/nginx/conf.d/carina.nebutra.com.conf"

if [ -n "${CARINA_REPO_DIR:-}" ]; then
  CARINA_DIR="$CARINA_REPO_DIR"
elif [ -d "${GITHUB_WORKSPACE:-}/carina/apps/docs" ]; then
  CARINA_DIR="${GITHUB_WORKSPACE}/carina"
elif [ -d "$ROOT_DIR/../carina/apps/docs" ]; then
  CARINA_DIR="$(cd "$ROOT_DIR/../carina" && pwd)"
else
  echo "Set CARINA_REPO_DIR to a Nebutra/carina checkout with apps/docs" >&2
  exit 1
fi

DOCS_DIR="$CARINA_DIR/apps/docs"
STAGE_DIR="$ROOT_DIR/.deploy/carina-docs"

log() { printf '[carina-docs] %s\n' "$1"; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }

require_cmd pnpm
require_cmd rsync
require_cmd ssh
[ -d "$DOCS_DIR" ] || { echo "missing $DOCS_DIR" >&2; exit 1; }
[ -f "$NGINX_CONF" ] || { echo "missing $NGINX_CONF" >&2; exit 1; }

log "Building Carina docs in $DOCS_DIR"
(
  cd "$DOCS_DIR"
  corepack enable 2>/dev/null || true
  pnpm install --frozen-lockfile
  pnpm run build
)
[ -f "$DOCS_DIR/dist/index.html" ] || { echo "no dist/index.html" >&2; exit 1; }

log "Staging dist"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
rsync -a --delete "$DOCS_DIR/dist/" "$STAGE_DIR/"

log "Preparing remote $REMOTE_APP_DIR/releases/$RELEASE_ID"
ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_APP_DIR/releases/$RELEASE_ID'"

log "Uploading"
rsync -az --delete "$STAGE_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/releases/$RELEASE_ID/"

log "Activate release"
ssh "$REMOTE_HOST" bash -s -- "$REMOTE_APP_DIR" "$RELEASE_ID" <<'REMOTE'
set -euo pipefail
REMOTE_APP_DIR="$1"
RELEASE_ID="$2"
ln -sfn "$REMOTE_APP_DIR/releases/$RELEASE_ID" "$REMOTE_APP_DIR/current"
cd "$REMOTE_APP_DIR/releases"
ls -1dt */ 2>/dev/null | tail -n +6 | xargs -r rm -rf
echo "active=$(readlink -f "$REMOTE_APP_DIR/current")"
REMOTE

if [ "$DEPLOY_NGINX_CONF" = "1" ]; then
  log "Install nginx vhost and inject include into main conf"
  scp -q "$NGINX_CONF" "$REMOTE_HOST:/tmp/carina.nebutra.com.conf"
  ssh "$REMOTE_HOST" bash -s <<'REMOTE'
set -euo pipefail
install -m 0644 /tmp/carina.nebutra.com.conf /etc/nginx/conf.d/carina.nebutra.com.conf

ensure_include() {
  local main="$1"
  [ -f "$main" ] || return 0
  if grep -q 'carina.nebutra.com.conf' "$main"; then
    echo "include already present in $main"
    return 0
  fi
  # Prefer insert after pebble include when present
  if grep -q 'pebble.nebutra.com.conf' "$main"; then
    sed -i '/pebble.nebutra.com.conf;/a\    include /etc/nginx/conf.d/carina.nebutra.com.conf;' "$main"
    echo "inserted after pebble include in $main"
    return 0
  fi
  # Insert before final closing brace of file
  awk '
    { lines[NR] = $0 }
    END {
      for (i = 1; i <= NR; i++) {
        if (i == NR && lines[i] ~ /^}/) {
          print "    # Carina product docs (static Astro) — A → ECS"
          print "    include /etc/nginx/conf.d/carina.nebutra.com.conf;"
        }
        print lines[i]
      }
    }
  ' "$main" > "${main}.new"
  install -m 0644 "${main}.new" "$main"
  rm -f "${main}.new"
  echo "appended include before final } in $main"
}

ensure_include /etc/nginx/nginx.conf
[ -f /etc/nginx/nginx-ecs-current.conf ] && ensure_include /etc/nginx/nginx-ecs-current.conf || true

nginx -t
systemctl reload nginx || nginx -s reload

echo "=== nginx -T carina ==="
nginx -T 2>/dev/null | grep -n 'server_name carina' | head -5 || {
  echo "ERROR: server_name carina.nebutra.com not active after reload" >&2
  exit 1
}

ls -la /var/www/nebutra/carina/current/index.html
# Probe: HTTP may 301→https; follow-less status on 443 with insecure if needed
code80=$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: carina.nebutra.com' --max-time 10 http://127.0.0.1/ || echo 000)
echo "origin_http80=$code80"
# If we can speak TLS locally with SNI
if [ -f /etc/ssl/nebutra/fullchain.pem ]; then
  code443=$(curl -skS -o /dev/null -w '%{http_code}' --resolve carina.nebutra.com:443:127.0.0.1 https://carina.nebutra.com/ --max-time 10 || echo 000)
  echo "origin_https443=$code443"
  body=$(curl -skS --resolve carina.nebutra.com:443:127.0.0.1 https://carina.nebutra.com/ --max-time 10 | head -c 120 || true)
  echo "body_snip=${body//$'\n'/ }"
fi
REMOTE
fi

log "done — https://carina.nebutra.com/ (A → ECS nginx static)"

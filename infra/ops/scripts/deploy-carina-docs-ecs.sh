#!/usr/bin/env bash
# Deploy Carina product docs (static Astro) to ECS for carina.nebutra.com.
#
# Topology (owner 2026-07-30): DNS A → 106.15.4.31 (CF proxied), same as pebble.
#
#   REMOTE_HOST=root@106.15.4.31 bash infra/ops/scripts/deploy-carina-docs-ecs.sh
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@106.15.4.31}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/var/www/nebutra/carina}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d%H%M%S)}"
DEPLOY_NGINX_CONF="${DEPLOY_NGINX_CONF:-1}"

# infra/ops/scripts → ../../../ = monorepo root
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

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }
}

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

if [ ! -f "$DOCS_DIR/dist/index.html" ]; then
  echo "no dist/index.html" >&2
  exit 1
fi

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
  log "Install nginx vhost"
  scp -q "$NGINX_CONF" "$REMOTE_HOST:/etc/nginx/conf.d/carina.nebutra.com.conf"
  ssh "$REMOTE_HOST" 'nginx -t && (systemctl reload nginx || nginx -s reload)'
fi

log "Local smoke on origin"
ssh "$REMOTE_HOST" "curl -sS -o /dev/null -w 'origin_http=%{http_code}\n' -H 'Host: carina.nebutra.com' --max-time 10 http://127.0.0.1/ || true"
log "done — https://carina.nebutra.com/ (A → ECS)"

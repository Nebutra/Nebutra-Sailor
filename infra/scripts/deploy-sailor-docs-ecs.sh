#!/usr/bin/env bash
# =============================================================================
# Deploy @nebutra/sailor-docs to ECS without building on the 2C4G origin.
#
# Local machine:
#   REMOTE_HOST=root@106.15.4.31 bash infra/scripts/deploy-sailor-docs-ecs.sh
#
# Remote prerequisites:
#   - Node.js >= 22
#   - pm2
#   - nginx reverse proxying docs.nebutra.com -> 127.0.0.1:3004
# =============================================================================

set -euo pipefail

APP_NAME="nebutra-docs"
PACKAGE_NAME="@nebutra/sailor-docs"
PORT="${PORT:-3004}"
DOCS_ORIGIN_URL="${DOCS_ORIGIN_URL:-https://docs.nebutra.com}"
REMOTE_HOST="${REMOTE_HOST:-root@106.15.4.31}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/nebutra/sailor-docs}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d%H%M%S)}"
DEPLOY_NGINX_CONF="${DEPLOY_NGINX_CONF:-1}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCS_DIR="$ROOT_DIR/apps/sailor-docs"
NGINX_CONF="$ROOT_DIR/infra/nginx/conf.d/docs.nebutra.com.conf"
STAGE_DIR="$ROOT_DIR/.deploy/sailor-docs"

log() {
  printf '[sailor-docs] %s\n' "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_cmd pnpm
require_cmd rsync
require_cmd ssh

cd "$ROOT_DIR"

log "Building $PACKAGE_NAME locally"
pnpm --filter "$PACKAGE_NAME" build

if [[ ! -f "$DOCS_DIR/.next/standalone/apps/sailor-docs/server.js" ]]; then
  printf 'Standalone server not found. Check apps/sailor-docs/next.config.ts output setting.\n' >&2
  exit 1
fi

log "Staging standalone artifact"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
rsync -a --delete "$DOCS_DIR/.next/standalone/" "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/apps/sailor-docs/.next"
rsync -a --delete "$DOCS_DIR/.next/static/" "$STAGE_DIR/apps/sailor-docs/.next/static/"

if [[ -d "$DOCS_DIR/public" ]]; then
  rsync -a --delete "$DOCS_DIR/public/" "$STAGE_DIR/apps/sailor-docs/public/"
fi

log "Preparing remote release $REMOTE_APP_DIR/releases/$RELEASE_ID"
ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_APP_DIR/releases/$RELEASE_ID'"

log "Uploading artifact to $REMOTE_HOST"
rsync -az --delete "$STAGE_DIR/" "$REMOTE_HOST:$REMOTE_APP_DIR/releases/$RELEASE_ID/"

log "Activating release and restarting PM2"
ssh "$REMOTE_HOST" bash -s -- "$REMOTE_APP_DIR" "$RELEASE_ID" "$APP_NAME" "$PORT" "$DOCS_ORIGIN_URL" <<'REMOTE'
set -euo pipefail

REMOTE_APP_DIR="$1"
RELEASE_ID="$2"
APP_NAME="$3"
PORT="$4"
DOCS_ORIGIN_URL="$5"
SERVER_FILE="$REMOTE_APP_DIR/current/apps/sailor-docs/server.js"

command -v node >/dev/null 2>&1 || {
  echo "Node.js is required on ECS" >&2
  exit 1
}

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "Node.js >= 22 is required. Current: $(node -v)" >&2
  exit 1
fi

command -v pm2 >/dev/null 2>&1 || {
  echo "pm2 is required on ECS" >&2
  exit 1
}

ln -sfn "$REMOTE_APP_DIR/releases/$RELEASE_ID" "$REMOTE_APP_DIR/current"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  NODE_ENV=production PORT="$PORT" NEXT_PUBLIC_DOCS_ORIGIN_URL="$DOCS_ORIGIN_URL" pm2 restart "$APP_NAME" --update-env
else
  NODE_ENV=production PORT="$PORT" NEXT_PUBLIC_DOCS_ORIGIN_URL="$DOCS_ORIGIN_URL" pm2 start "$SERVER_FILE" --name "$APP_NAME"
fi

pm2 save
pm2 status "$APP_NAME"
REMOTE

if [[ "$DEPLOY_NGINX_CONF" != "0" ]]; then
  log "Installing docs.nebutra.com Nginx config"
  rsync -az "$NGINX_CONF" "$REMOTE_HOST:/tmp/docs.nebutra.com.conf"
  ssh "$REMOTE_HOST" bash -s <<'REMOTE'
set -euo pipefail

mkdir -p /etc/nginx/conf.d /var/www/certbot
cp /tmp/docs.nebutra.com.conf /etc/nginx/conf.d/docs.nebutra.com.conf
nginx -t

if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx
else
  nginx -s reload
fi

if ! nginx -T 2>/dev/null | grep -q "server_name docs.nebutra.com"; then
  echo "docs.nebutra.com is not active in nginx -T; ensure /etc/nginx/nginx.conf includes /etc/nginx/conf.d/docs.nebutra.com.conf" >&2
  exit 1
fi
REMOTE
fi

log "Done. Verify with: curl -I http://docs.nebutra.com/"

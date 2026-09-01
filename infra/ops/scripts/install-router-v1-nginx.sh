#!/usr/bin/env bash
# Install the router.nebutra.com /v1 → New-API location on the Cloud VM.
# Replaces only the vhost file. Does not replace nginx.conf.
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@106.15.4.31}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NGINX_CONF="$ROOT_DIR/infra/runtime/nginx/conf.d/router.nebutra.com.conf"

log() { printf '[router-v1-nginx] %s\n' "$1"; }

[ -f "$NGINX_CONF" ] || { echo "missing $NGINX_CONF" >&2; exit 1; }
command -v ssh >/dev/null 2>&1 || { echo "Missing: ssh" >&2; exit 1; }
command -v scp >/dev/null 2>&1 || { echo "Missing: scp" >&2; exit 1; }

log "Install router vhost with /v1 → 127.0.0.1:3301"
scp -q "$NGINX_CONF" "$REMOTE_HOST:/tmp/router.nebutra.com.conf"
ssh "$REMOTE_HOST" bash -s <<'REMOTE'
set -euo pipefail
install -m 0644 /tmp/router.nebutra.com.conf /etc/nginx/conf.d/router.nebutra.com.conf
nginx -t
systemctl reload nginx || nginx -s reload

grep -q 'nebutra_new_api' /etc/nginx/conf.d/router.nebutra.com.conf || {
  echo "ERROR: installed router vhost is missing the New-API upstream" >&2
  exit 1
}
nginx -T 2>&1 | grep -q 'nebutra_new_api' || {
  echo "ERROR: /v1 New-API upstream not active after reload" >&2
  exit 1
}
echo "router /v1 → 127.0.0.1:3301 is active"
REMOTE

log "done — Host router.nebutra.com /v1 proxies New-API"

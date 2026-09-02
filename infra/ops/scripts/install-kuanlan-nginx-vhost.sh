#!/usr/bin/env bash
# Install the kuanlan.nebutra.com nginx vhost on the Cloud VM and inject the
# include into the live main conf. Same pattern as deploy-carina-docs-ecs.sh:
# do not replace nginx.conf, or sibling hosts (carina, pebble) lose their
# includes and 301 to apex.
#
# Without an active server_name, Host falls through to default 443 → 301
# https://nebutra.com$request_uri. Create / Wardrobe / Moments / Me then
# 404 on the marketing site.
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@106.15.4.31}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NGINX_CONF="$ROOT_DIR/infra/runtime/nginx/conf.d/kuanlan.nebutra.com.conf"

log() { printf '[kuanlan-nginx] %s\n' "$1"; }

[ -f "$NGINX_CONF" ] || { echo "missing $NGINX_CONF" >&2; exit 1; }
command -v ssh >/dev/null 2>&1 || { echo "Missing: ssh" >&2; exit 1; }
command -v scp >/dev/null 2>&1 || { echo "Missing: scp" >&2; exit 1; }

log "Install nginx vhost and inject include into main conf"
scp -q "$NGINX_CONF" "$REMOTE_HOST:/tmp/kuanlan.nebutra.com.conf"
ssh "$REMOTE_HOST" bash -s <<'REMOTE'
set -euo pipefail
install -m 0644 /tmp/kuanlan.nebutra.com.conf /etc/nginx/conf.d/kuanlan.nebutra.com.conf

ensure_include() {
  local main="$1"
  [ -f "$main" ] || return 0
  if grep -q 'kuanlan.nebutra.com.conf' "$main"; then
    echo "include already present in $main"
    return 0
  fi
  if grep -q 'pebble.nebutra.com.conf' "$main"; then
    sed -i '/pebble.nebutra.com.conf;/a\    include /etc/nginx/conf.d/kuanlan.nebutra.com.conf;' "$main"
    echo "inserted after pebble include in $main"
    return 0
  fi
  awk '
    { lines[NR] = $0 }
    END {
      for (i = 1; i <= NR; i++) {
        if (i == NR && lines[i] ~ /^}/) {
          print "    # 观澜 product edge (PM2 :3120) — A → ECS"
          print "    include /etc/nginx/conf.d/kuanlan.nebutra.com.conf;"
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

echo "=== nginx -T kuanlan ==="
nginx -T 2>/dev/null | grep -n 'server_name kuanlan' | head -5 || {
  echo "ERROR: server_name kuanlan.nebutra.com not active after reload" >&2
  exit 1
}
REMOTE

log "done — https://kuanlan.nebutra.com/ should stay on this host"

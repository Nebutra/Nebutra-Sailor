#!/usr/bin/env bash
# Issue a Router consume key (New-API user token) and write it only to
# kuanlan ROUTER_API_KEY. The 302.ai channel key never leaves New-API.
#
# Run from CI with REMOTE_HOST set. Does not print secrets.
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@106.15.4.31}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE="$ROOT_DIR/infra/nebutra-router/compose.ecs.yaml"

log() { printf '[seed-router-key] %s\n' "$1"; }

command -v ssh >/dev/null 2>&1 || { echo "Missing: ssh" >&2; exit 1; }
command -v scp >/dev/null 2>&1 || { echo "Missing: scp" >&2; exit 1; }
[ -f "$COMPOSE" ] || { echo "missing $COMPOSE" >&2; exit 1; }

if [ -z "${CHANNEL_302_KEY:-}" ]; then
  echo "::warning::CHANNEL_302_KEY empty — token will still issue; image2 channel may be missing"
fi

secrets_file="$(mktemp)"
chmod 600 "$secrets_file"
python3 - "$secrets_file" <<'PY'
import json, os, subprocess, sys

path = sys.argv[1]
try:
    import bcrypt
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "bcrypt", "-q"])
    import bcrypt

# New-API v0.8 validates passwords as min=8, max=20. hex(8) is 16 chars.
root_password = os.urandom(8).hex()
root_hash = bcrypt.hashpw(root_password.encode(), bcrypt.gensalt(rounds=10)).decode()
with open(path, "w", encoding="utf-8") as handle:
    json.dump(
        {
            "CHANNEL_302_KEY": os.environ.get("CHANNEL_302_KEY", ""),
            "NEW_API_ACCESS_TOKEN": os.environ.get("NEW_API_ACCESS_TOKEN", ""),
            "ROOT_PASSWORD": root_password,
            "ROOT_PASSWORD_HASH": root_hash,
        },
        handle,
    )
PY
scp -q "$COMPOSE" "$REMOTE_HOST:/tmp/compose.ecs.yaml"
scp -q "$ROOT_DIR/infra/ops/scripts/seed-kuanlan-router-key.remote.py" \
  "$REMOTE_HOST:/tmp/seed-kuanlan-router-key.remote.py"
scp -q "$secrets_file" "$REMOTE_HOST:/tmp/seed-kuanlan-secrets.json"
rm -f "$secrets_file"

ssh "$REMOTE_HOST" bash -s <<'REMOTE'
set -euo pipefail
ROOT="${ECS_DEPLOY_ROOT:-/var/www/nebutra}"
DATA="$ROOT/new-api"
BASE="http://127.0.0.1:3301"

mkdir -p "$DATA/data"
chmod 700 "$DATA"
install -m 0644 /tmp/compose.ecs.yaml "$DATA/compose.ecs.yaml"

if [ ! -f "$DATA/session.secret" ]; then
  openssl rand -hex 32 > "$DATA/session.secret"
  chmod 600 "$DATA/session.secret"
fi
export NEW_API_SESSION_SECRET
NEW_API_SESSION_SECRET="$(cat "$DATA/session.secret")"

if command -v docker >/dev/null 2>&1; then
  docker compose -f "$DATA/compose.ecs.yaml" --project-directory "$DATA" up -d
fi

ready=0
for i in $(seq 1 36); do
  if curl -fsS --max-time 3 "$BASE/api/status" >/dev/null 2>&1 \
    || curl -fsS --max-time 3 "$BASE/" >/dev/null 2>&1; then
    echo "new-api listening on 127.0.0.1:3301"
    ready=1
    break
  fi
  sleep 5
done
if [ "$ready" -ne 1 ]; then
  echo "::error::new-api did not become ready on :3301" >&2
  exit 1
fi

if [ ! -f "$DATA/root.password" ]; then
  openssl rand -hex 20 > "$DATA/root.password"
  chmod 600 "$DATA/root.password"
fi

export NEW_API_ROOT_PASSWORD
NEW_API_ROOT_PASSWORD="$(cat "$DATA/root.password")"
export CHANNEL_302_KEY NEW_API_ACCESS_TOKEN
python3 /tmp/seed-kuanlan-router-key.remote.py "$BASE" "$ROOT"

if command -v pm2 >/dev/null 2>&1; then
  pm2 reload kuanlan --update-env || pm2 restart kuanlan || true
fi

# Health from the box — never print the key.
sleep 2
health="$(curl -fsS --max-time 10 http://127.0.0.1:3120/api/e2e/health || true)"
echo "kuanlan health: $health"
echo "$health" | grep -q '"configured":true' || {
  echo "::error::kuanlan consume still unconfigured after seed" >&2
  exit 1
}

rm -f /tmp/seed-kuanlan-router-key.remote.py /tmp/compose.ecs.yaml
REMOTE

log "Router issued a consume key; kuanlan consume is configured"

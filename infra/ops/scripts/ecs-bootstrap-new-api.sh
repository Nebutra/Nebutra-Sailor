#!/usr/bin/env bash
# Start New-API on the ECS box (localhost:3301) and optionally seed the 302.ai
# channel. The 302 key never leaves this host. Public consume stays on
# router.nebutra.com/v1 with a New-API user token.
set -euo pipefail

ROOT="${ECS_DEPLOY_ROOT:-/var/www/nebutra}"
DATA="$ROOT/new-api"
COMPOSE="$DATA/compose.ecs.yaml"
CHANNEL_KEY="${CHANNEL_302_KEY:-}"
BASE="http://127.0.0.1:3301"

mkdir -p "$DATA/data"
chmod 700 "$DATA"

if [ ! -f "$DATA/session.secret" ]; then
  openssl rand -hex 32 > "$DATA/session.secret"
  chmod 600 "$DATA/session.secret"
fi
export NEW_API_SESSION_SECRET
NEW_API_SESSION_SECRET="$(cat "$DATA/session.secret")"

if [ ! -f "$COMPOSE" ]; then
  echo "missing $COMPOSE — copy compose.ecs.yaml first" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not installed; skip New-API bootstrap" >&2
  exit 0
fi

docker compose -f "$COMPOSE" --project-directory "$DATA" up -d

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if curl -fsS --max-time 3 "$BASE/api/status" >/dev/null 2>&1 \
    || curl -fsS --max-time 3 "$BASE/" >/dev/null 2>&1; then
    echo "new-api listening on 127.0.0.1:3301"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "new-api did not become ready on :3301" >&2
    exit 0
  fi
  sleep 5
done

replace_env() {
  local file="$1" key="$2" value="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  chmod 600 "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{done=0} $0 ~ "^"k"=" { print k"="v; done=1; next } { print } END { if (!done) print k"="v }' "$file" > "$tmp"
    mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

replace_env "$ROOT/router/.env" NEW_API_BASE_URL "${NEW_API_BASE_URL:-http://127.0.0.1:3301/v1}"

if [ -z "$CHANNEL_KEY" ]; then
  echo "no CHANNEL_302_KEY — New-API is up; add the 302 channel in admin"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 reload router --update-env || pm2 restart router || true
  fi
  exit 0
fi

if [ ! -f "$DATA/root.password" ]; then
  openssl rand -hex 20 > "$DATA/root.password"
  chmod 600 "$DATA/root.password"
fi
ROOT_PASS="$(cat "$DATA/root.password")"

NEW_API_ROOT_PASSWORD="$ROOT_PASS" python3 - "$BASE" "$ROOT" <<'PY' || {
  echo "New-API admin API seed skipped (container is up; configure channel by hand)"
  exit 0
}
import json, os, sys, urllib.error, urllib.request
base, root = sys.argv[1:3]
password = os.environ["NEW_API_ROOT_PASSWORD"]
channel_key = os.environ["CHANNEL_302_KEY"]

def req(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        headers["New-Api-User"] = "1"
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read().decode()
        return json.loads(raw) if raw else {}

def ok(payload):
    return bool(payload) and payload.get("success", True) is not False

token = None
for path, body in (
    ("/api/user/login", {"username": "root", "password": password}),
    ("/api/user/register", {"username": "root", "password": password}),
    ("/api/setup", {"username": "root", "password": password}),
):
    try:
        payload = req("POST", path, body)
    except urllib.error.HTTPError:
        continue
    if not ok(payload):
        continue
    token = (
        (payload.get("data") or {}).get("access_token")
        or (payload.get("data") or {}).get("token")
        or payload.get("token")
    )
    if token:
        break

if not token:
    raise SystemExit("no admin token")

try:
    req(
        "POST",
        "/api/channel/",
        {
            "type": 1,
            "name": "302-image2",
            "key": channel_key,
            "base_url": "https://api.302.ai",
            "models": "gpt-image-2",
            "group": "default",
            "status": 1,
        },
        token,
    )
except urllib.error.HTTPError:
    pass

token_payload = req(
    "POST",
    "/api/token/",
    {"name": "kuanlan", "remain_quota": -1, "unlimited_quota": True},
    token,
)
user_token = (
    (token_payload.get("data") or {}).get("key")
    or (token_payload.get("data") or {}).get("token")
    or ""
)
if not user_token:
    raise SystemExit("no user token")

env_path = f"{root}/kuanlan/.env"
lines = []
try:
    with open(env_path, encoding="utf-8") as handle:
        lines = handle.readlines()
except FileNotFoundError:
    pass
written = False
out = []
for line in lines:
    if line.startswith("ROUTER_API_KEY="):
        out.append(f"ROUTER_API_KEY={user_token}\n")
        written = True
    else:
        out.append(line)
if not written:
    out.append(f"ROUTER_API_KEY={user_token}\n")
with open(env_path, "w", encoding="utf-8") as handle:
    handle.writelines(out)
print("seeded kuanlan ROUTER_API_KEY from New-API user token")
PY

if command -v pm2 >/dev/null 2>&1; then
  pm2 reload router --update-env || pm2 restart router || true
  pm2 reload kuanlan --update-env || pm2 restart kuanlan || true
fi

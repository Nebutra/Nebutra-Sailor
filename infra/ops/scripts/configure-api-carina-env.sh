#!/usr/bin/env bash
# Inject Carina Track-B co-deploy defaults into api-gateway env + restart PM2.
#
# Same-host defaults (no remote URL needed):
#   CARINA_CODEPLOY=1
#   CARINA_DAEMON_SOCK=/var/carina/run/daemon.sock
#   CARINA_WORKSPACE_ROOT=/var/carina/ws
#   FEATURE_FLAG_AGENT_RUNTIME_DEMO=true
#
# Optional overrides via env before running.
set -euo pipefail

ENV_FILE="${API_ENV_FILE:-/var/www/nebutra/api/.env}"
CARINA_ROOT="${CARINA_ROOT:-/var/carina}"

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

upsert() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k {$0=k"="v} {print}' "$ENV_FILE" >"$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >>"$ENV_FILE"
  fi
}

# Co-deploy defaults
upsert "CARINA_CODEPLOY" "${CARINA_CODEPLOY:-1}"
upsert "CARINA_DAEMON_SOCK" "${CARINA_DAEMON_SOCK:-$CARINA_ROOT/run/daemon.sock}"
upsert "CARINA_WORKSPACE_ROOT" "${CARINA_WORKSPACE_ROOT:-$CARINA_ROOT/ws}"

# Optional HTTP still supported
[ -n "${CARINA_JSONRPC_URL:-}" ] && upsert "CARINA_JSONRPC_URL" "$CARINA_JSONRPC_URL"
[ -n "${CARINA_JSONRPC_TOKEN:-}" ] && upsert "CARINA_JSONRPC_TOKEN" "$CARINA_JSONRPC_TOKEN"
[ -n "${CARINA_JSONRPC_PATH:-}" ] && upsert "CARINA_JSONRPC_PATH" "$CARINA_JSONRPC_PATH"
[ -n "${CARINA_WORKSPACE_TEMPLATE:-}" ] && upsert "CARINA_WORKSPACE_TEMPLATE" "$CARINA_WORKSPACE_TEMPLATE"
[ -n "${CARINA_WORKSPACE_MAP:-}" ] && upsert "CARINA_WORKSPACE_MAP" "$CARINA_WORKSPACE_MAP"
[ -n "${CARINA_SESSION_APPROVAL_MODE:-}" ] && upsert "CARINA_SESSION_APPROVAL_MODE" "$CARINA_SESSION_APPROVAL_MODE"
[ -n "${CARINA_AUTO_APPROVE:-}" ] && upsert "CARINA_AUTO_APPROVE" "$CARINA_AUTO_APPROVE"
[ -n "${CARINA_CLIENT_ID:-}" ] && upsert "CARINA_CLIENT_ID" "$CARINA_CLIENT_ID"

if [ "${ENABLE_AGENT_RUNTIME_DEMO:-true}" = "true" ]; then
  upsert "FEATURE_FLAG_AGENT_RUNTIME_DEMO" "true"
fi

chmod 600 "$ENV_FILE"
echo "Updated $ENV_FILE (Carina co-deploy)"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart api-gateway --update-env || pm2 restart api-gateway
  pm2 save || true
  echo "pm2 restarted api-gateway"
else
  echo "pm2 not found — restart api-gateway manually"
fi

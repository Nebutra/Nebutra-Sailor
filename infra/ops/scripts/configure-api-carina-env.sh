#!/usr/bin/env bash
# Merge Carina Track-B env into ECS api-gateway env file and restart PM2.
#
# Run on the VM (or via SSH from CI):
#   CARINA_JSONRPC_URL=http://127.0.0.1:7420/jsonrpc \
#   CARINA_WORKSPACE_ROOT=/var/carina/ws \
#   bash configure-api-carina-env.sh
#
# Optional:
#   CARINA_JSONRPC_TOKEN, CARINA_JSONRPC_PATH, CARINA_WORKSPACE_TEMPLATE,
#   CARINA_WORKSPACE_MAP, CARINA_SESSION_APPROVAL_MODE, CARINA_AUTO_APPROVE,
#   CARINA_CLIENT_ID, ENABLE_AGENT_RUNTIME_DEMO=true
#
# Env file default: /var/www/nebutra/api/.env
set -euo pipefail

ENV_FILE="${API_ENV_FILE:-/var/www/nebutra/api/.env}"

if [ -z "${CARINA_JSONRPC_URL:-}" ]; then
  echo "CARINA_JSONRPC_URL is required" >&2
  exit 1
fi

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

upsert "CARINA_JSONRPC_URL" "$CARINA_JSONRPC_URL"
[ -n "${CARINA_JSONRPC_TOKEN:-}" ] && upsert "CARINA_JSONRPC_TOKEN" "$CARINA_JSONRPC_TOKEN"
[ -n "${CARINA_JSONRPC_PATH:-}" ] && upsert "CARINA_JSONRPC_PATH" "$CARINA_JSONRPC_PATH"
[ -n "${CARINA_WORKSPACE_ROOT:-}" ] && upsert "CARINA_WORKSPACE_ROOT" "$CARINA_WORKSPACE_ROOT"
[ -n "${CARINA_WORKSPACE_TEMPLATE:-}" ] && upsert "CARINA_WORKSPACE_TEMPLATE" "$CARINA_WORKSPACE_TEMPLATE"
[ -n "${CARINA_WORKSPACE_MAP:-}" ] && upsert "CARINA_WORKSPACE_MAP" "$CARINA_WORKSPACE_MAP"
[ -n "${CARINA_SESSION_APPROVAL_MODE:-}" ] && upsert "CARINA_SESSION_APPROVAL_MODE" "$CARINA_SESSION_APPROVAL_MODE"
[ -n "${CARINA_AUTO_APPROVE:-}" ] && upsert "CARINA_AUTO_APPROVE" "$CARINA_AUTO_APPROVE"
[ -n "${CARINA_CLIENT_ID:-}" ] && upsert "CARINA_CLIENT_ID" "$CARINA_CLIENT_ID"

if [ "${ENABLE_AGENT_RUNTIME_DEMO:-true}" = "true" ]; then
  upsert "FEATURE_FLAG_AGENT_RUNTIME_DEMO" "true"
fi

chmod 600 "$ENV_FILE"
echo "Updated $ENV_FILE (Carina Track B)"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart api-gateway --update-env || pm2 restart api-gateway
  pm2 save || true
  echo "pm2 restarted api-gateway"
else
  echo "pm2 not found — restart api-gateway manually"
fi

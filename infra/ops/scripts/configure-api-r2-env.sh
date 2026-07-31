#!/usr/bin/env bash
# Merge R2 / Pebble diagnostics env into ECS api-gateway env file and restart PM2.
#
# Run on the VM (or via SSH from CI):
#   R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
#   bash configure-api-r2-env.sh
#
# Env file default: /var/www/nebutra/api/.env
set -euo pipefail

ENV_FILE="${API_ENV_FILE:-/var/www/nebutra/api/.env}"
ACCOUNT_ID="${R2_ACCOUNT_ID:-${CLOUDFLARE_ACCOUNT_ID:-a4248a5738df319996a70092fe598d37}}"
BUCKET="${PEBBLE_DIAGNOSTICS_BUCKET:-nebutra-pebble-diagnostics}"
ENDPOINT="${R2_ENDPOINT:-https://${ACCOUNT_ID}.r2.cloudflarestorage.com}"

if [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_SECRET_ACCESS_KEY:-}" ]; then
  echo "R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required" >&2
  exit 1
fi

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

upsert() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # portable in-place replace
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k {$0=k"="v} {print}' "$ENV_FILE" >"$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >>"$ENV_FILE"
  fi
}

upsert "UPLOAD_PROVIDER" "s3"
upsert "R2_ACCOUNT_ID" "$ACCOUNT_ID"
upsert "R2_ACCESS_KEY_ID" "$R2_ACCESS_KEY_ID"
upsert "R2_SECRET_ACCESS_KEY" "$R2_SECRET_ACCESS_KEY"
upsert "R2_ENDPOINT" "$ENDPOINT"
upsert "PEBBLE_DIAGNOSTICS_BUCKET" "$BUCKET"
if [ -n "${PEBBLE_DIAGNOSTICS_DIR:-}" ]; then
  upsert "PEBBLE_DIAGNOSTICS_DIR" "$PEBBLE_DIAGNOSTICS_DIR"
fi

chmod 600 "$ENV_FILE"
echo "Updated $ENV_FILE (R2 + PEBBLE_DIAGNOSTICS_BUCKET)"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart api-gateway --update-env || pm2 restart api-gateway
  pm2 save || true
  echo "pm2 restarted api-gateway"
else
  echo "pm2 not found — restart api-gateway manually"
fi

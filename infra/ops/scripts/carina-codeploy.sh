#!/usr/bin/env bash
# Same-host Carina co-deploy with Sailor api-gateway.
#
# 1) Ensures binary + dirs under /var/carina
# 2) Starts/reloads PM2 process `carina-daemon`
# 3) Injects default api-gateway env (socket + workspace + demo flag)
#
# Usage (on the VM as deploy user with sudo for /var/carina if needed):
#   bash infra/ops/scripts/carina-codeploy.sh
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
CARINA_ROOT="${CARINA_ROOT:-/var/carina}"
API_ENV_FILE="${API_ENV_FILE:-/var/www/nebutra/api/.env}"
SOCKET_PATH="${CARINA_DAEMON_SOCK:-$CARINA_ROOT/run/daemon.sock}"
STATE_DIR="${CARINA_STATE_DIR:-$CARINA_ROOT/state}"
WS_ROOT="${CARINA_WORKSPACE_ROOT:-$CARINA_ROOT/ws}"
APPROVAL_MODE="${CARINA_SESSION_APPROVAL_MODE:-always-approve}"

if [ ! -x "$CARINA_ROOT/bin/carina-daemon" ]; then
  echo "Installing carina-daemon…"
  bash "$SCRIPTS_DIR/install-carina-daemon.sh"
fi

mkdir -p "$CARINA_ROOT/run" "$WS_ROOT" "$STATE_DIR"

# Remove stale socket if present and no live process
if [ -S "$SOCKET_PATH" ] && ! pgrep -f "carina-daemon.*$SOCKET_PATH" >/dev/null 2>&1; then
  rm -f "$SOCKET_PATH" || true
fi

# Start via PM2 when available
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe carina-daemon >/dev/null 2>&1; then
    pm2 restart carina-daemon --update-env || pm2 reload carina-daemon
  else
    # Prefer ecosystem entry when present
    ECO="${PM2_CONFIG:-/var/www/nebutra/ecosystem.config.cjs}"
    if [ -f "$ECO" ] && grep -q 'carina-daemon' "$ECO" 2>/dev/null; then
      pm2 start "$ECO" --only carina-daemon
    else
      pm2 start "$CARINA_ROOT/bin/carina-daemon" --name carina-daemon -- \
        -socket "$SOCKET_PATH" \
        -state "$STATE_DIR" \
        -approval-mode "$APPROVAL_MODE"
    fi
  fi
  pm2 save || true
else
  echo "pm2 not found — starting carina-daemon in background"
  nohup "$CARINA_ROOT/bin/carina-daemon" \
    -socket "$SOCKET_PATH" \
    -state "$STATE_DIR" \
    -approval-mode "$APPROVAL_MODE" \
    >"$CARINA_ROOT/run/daemon.log" 2>&1 &
fi

# Wait for socket
for i in $(seq 1 30); do
  if [ -S "$SOCKET_PATH" ]; then
    echo "carina socket ready: $SOCKET_PATH"
    break
  fi
  sleep 0.5
done
if [ ! -S "$SOCKET_PATH" ]; then
  echo "warning: socket not ready yet at $SOCKET_PATH" >&2
fi

# Inject api-gateway env (defaults for co-deploy)
bash "$SCRIPTS_DIR/configure-api-carina-env.sh"

echo "Carina co-deploy complete."
echo "  socket:    $SOCKET_PATH"
echo "  workspace: $WS_ROOT"
echo "  api env:   $API_ENV_FILE"

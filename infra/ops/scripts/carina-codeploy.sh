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

# Env first — gateway can fail-closed cleanly while daemon installs.
echo "Injecting api-gateway Carina env (co-deploy defaults)…"
bash "$SCRIPTS_DIR/configure-api-carina-env.sh" || true

if [ ! -x "$CARINA_ROOT/bin/carina-daemon" ]; then
  echo "Installing carina-daemon…"
  if ! bash "$SCRIPTS_DIR/install-carina-daemon.sh"; then
    echo "ERROR: install-carina-daemon.sh failed" >&2
    exit 1
  fi
fi

mkdir -p "$CARINA_ROOT/run" "$WS_ROOT" "$STATE_DIR"

# Remove stale socket if present and no live process
if [ -S "$SOCKET_PATH" ] && ! pgrep -f "carina-daemon.*$SOCKET_PATH" >/dev/null 2>&1; then
  rm -f "$SOCKET_PATH" || true
fi

# Detect whether the binary can run on the host (GLIBC). Official linux_amd64
# builds need GLIBC_2.34+; older ECS images fall back to Docker (ubuntu:22.04).
needs_docker=0
if ! "$CARINA_ROOT/bin/carina-daemon" -h >/dev/null 2>&1; then
  if "$CARINA_ROOT/bin/carina-daemon" -h 2>&1 | grep -qi 'GLIBC'; then
    echo "Host glibc too old for carina-daemon — using Docker (ubuntu:22.04)"
    needs_docker=1
  else
    # Binary may print help to stderr and exit non-zero; only force docker on GLIBC.
    if ldd "$CARINA_ROOT/bin/carina-daemon" 2>&1 | grep -qi 'not found\|GLIBC'; then
      echo "Shared library mismatch for carina-daemon — using Docker"
      needs_docker=1
    fi
  fi
fi

start_native() {
  if command -v pm2 >/dev/null 2>&1; then
    # Stop docker variant if any
    docker rm -f carina-daemon >/dev/null 2>&1 || true
    if pm2 describe carina-daemon >/dev/null 2>&1; then
      pm2 restart carina-daemon --update-env || pm2 reload carina-daemon
    else
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
    nohup "$CARINA_ROOT/bin/carina-daemon" \
      -socket "$SOCKET_PATH" \
      -state "$STATE_DIR" \
      -approval-mode "$APPROVAL_MODE" \
      >"$CARINA_ROOT/run/daemon.log" 2>&1 &
  fi
}

start_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker required to run carina-daemon on this host (glibc too old)" >&2
    return 1
  fi
  # Prefer not to crash-loop a broken native pm2 app
  if command -v pm2 >/dev/null 2>&1; then
    pm2 delete carina-daemon >/dev/null 2>&1 || true
    pm2 save || true
  fi
  docker rm -f carina-daemon >/dev/null 2>&1 || true
  # Pull once (cached thereafter). ubuntu:22.04 has GLIBC_2.35.
  docker pull ubuntu:22.04 >/dev/null
  docker run -d --name carina-daemon --restart unless-stopped \
    -v "$CARINA_ROOT/run:$CARINA_ROOT/run" \
    -v "$STATE_DIR:$STATE_DIR" \
    -v "$WS_ROOT:$WS_ROOT" \
    -v "$CARINA_ROOT/bin/carina-daemon:/usr/local/bin/carina-daemon:ro" \
    ubuntu:22.04 \
    /usr/local/bin/carina-daemon \
      -socket "$SOCKET_PATH" \
      -state "$STATE_DIR" \
      -approval-mode "$APPROVAL_MODE"
  echo "carina-daemon running in docker (ubuntu:22.04)"
}

if [ "$needs_docker" = "1" ]; then
  start_docker
else
  start_native
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

# Re-inject after daemon start (idempotent)
bash "$SCRIPTS_DIR/configure-api-carina-env.sh" || true

echo "Carina co-deploy complete."
echo "  socket:    $SOCKET_PATH"
echo "  workspace: $WS_ROOT"
echo "  api env:   $API_ENV_FILE"

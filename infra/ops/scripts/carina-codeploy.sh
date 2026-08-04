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
  # Prefer CN registry mirrors when Docker Hub is slow.
  pull_ubuntu() {
    local refs=(
      "${CARINA_DOCKER_IMAGE:-}"
      "docker.m.daocloud.io/library/ubuntu:22.04"
      "dockerproxy.net/library/ubuntu:22.04"
      "ubuntu:22.04"
    )
    local r
    for r in "${refs[@]}"; do
      [ -n "$r" ] || continue
      echo "docker pull $r"
      if docker pull "$r"; then
        # Retag so run uses a stable local name
        docker tag "$r" carina-runtime-ubuntu:22.04 2>/dev/null || true
        echo "$r"
        return 0
      fi
    done
    return 1
  }
  IMAGE_REF="$(pull_ubuntu)" || {
    echo "ERROR: failed to pull ubuntu:22.04 (try CARINA_DOCKER_IMAGE=...)" >&2
    return 1
  }
  # Prefer retagged name when available
  if docker image inspect carina-runtime-ubuntu:22.04 >/dev/null 2>&1; then
    IMAGE_REF="carina-runtime-ubuntu:22.04"
  fi
  # Ensure host dirs exist and are writable from container (root)
  mkdir -p "$CARINA_ROOT/run" "$STATE_DIR" "$WS_ROOT"
  chmod 755 "$CARINA_ROOT/run" "$STATE_DIR" "$WS_ROOT" || true
  rm -f "$SOCKET_PATH" || true

  docker run -d --name carina-daemon --restart unless-stopped \
    -e HOME="$CARINA_ROOT" \
    -v "$CARINA_ROOT/run:$CARINA_ROOT/run" \
    -v "$STATE_DIR:$STATE_DIR" \
    -v "$WS_ROOT:$WS_ROOT" \
    -v "$CARINA_ROOT/bin/carina-daemon:/usr/local/bin/carina-daemon:ro" \
    "$IMAGE_REF" \
    /usr/local/bin/carina-daemon \
      -socket "$SOCKET_PATH" \
      -state "$STATE_DIR" \
      -approval-mode "$APPROVAL_MODE"
  echo "carina-daemon running in docker ($IMAGE_REF)"
  # Brief settle before wait loop
  sleep 2
  docker ps --filter name=carina-daemon --format 'table {{.Names}}\t{{.Status}}' || true
}

if [ "$needs_docker" = "1" ]; then
  start_docker
else
  start_native
fi

# Wait for socket (docker cold start / first pull can take a bit)
wait_secs=90
if [ "${needs_docker:-0}" = "1" ]; then
  wait_secs=120
fi
echo "Waiting up to ${wait_secs}s for $SOCKET_PATH …"
ready=0
for i in $(seq 1 "$wait_secs"); do
  if [ -S "$SOCKET_PATH" ]; then
    echo "carina socket ready: $SOCKET_PATH (after ${i}s)"
    ready=1
    break
  fi
  # If docker mode, surface crash early
  if [ "${needs_docker:-0}" = "1" ] && command -v docker >/dev/null 2>&1; then
    if ! docker ps --format '{{.Names}}' | grep -qx carina-daemon; then
      echo "ERROR: carina-daemon container not running" >&2
      docker logs carina-daemon 2>&1 | tail -40 >&2 || true
      break
    fi
  fi
  sleep 1
done
if [ "$ready" != "1" ]; then
  echo "ERROR: socket not ready at $SOCKET_PATH" >&2
  if command -v docker >/dev/null 2>&1; then
    docker ps -a --filter name=carina-daemon 2>&1 | tail -5 >&2 || true
    docker logs carina-daemon 2>&1 | tail -40 >&2 || true
  fi
  if command -v pm2 >/dev/null 2>&1; then
    pm2 describe carina-daemon 2>&1 | tail -20 >&2 || true
  fi
  exit 1
fi

# Re-inject after daemon start (idempotent)
bash "$SCRIPTS_DIR/configure-api-carina-env.sh" || true

echo "Carina co-deploy complete."
echo "  socket:    $SOCKET_PATH"
echo "  workspace: $WS_ROOT"
echo "  api env:   $API_ENV_FILE"

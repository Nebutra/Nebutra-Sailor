#!/usr/bin/env bash
# Install carina-daemon binary for same-host Track-B co-deploy with api-gateway.
#
# Default layout:
#   /var/carina/bin/carina-daemon
#   /var/carina/run/daemon.sock   (created at runtime)
#   /var/carina/ws               (workspace root)
#   /var/carina/state            (session/event storage)
#
# Download order (fastest path first for CN ECS):
#   1) CI-staged binary at /tmp/carina-ops/carina-daemon
#   2) CARINA_RELEASE_URL (explicit override)
#   3) GitHub release via CN-friendly mirrors, then origin
#
# Usage (on the VM):
#   sudo bash install-carina-daemon.sh
#   CARINA_VERSION=0.8.1 bash install-carina-daemon.sh
#   CARINA_RELEASE_MIRRORS="https://ghfast.top/ https://ghproxy.net/" bash install-carina-daemon.sh
set -euo pipefail

CARINA_VERSION="${CARINA_VERSION:-0.8.1}"
CARINA_ROOT="${CARINA_ROOT:-/var/carina}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH_TAG="linux_amd64" ;;
  aarch64|arm64) ARCH_TAG="linux_arm64" ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac

ASSET="carina_${CARINA_VERSION}_${ARCH_TAG}.tar.gz"
ORIGIN_URL="https://github.com/Nebutra/carina/releases/download/v${CARINA_VERSION}/${ASSET}"

mkdir -p "$CARINA_ROOT/bin" "$CARINA_ROOT/run" "$CARINA_ROOT/ws" "$CARINA_ROOT/state" "$CARINA_ROOT/tmp"

# Prefer a binary pre-staged by CI (avoids any GH→China download).
STAGED="${CARINA_STAGED_BIN:-/tmp/carina-ops/carina-daemon}"
if [ -f "$STAGED" ] && [ -s "$STAGED" ]; then
  install -m 0755 "$STAGED" "$CARINA_ROOT/bin/carina-daemon"
  echo "Installed $CARINA_ROOT/bin/carina-daemon from staged $STAGED"
  "$CARINA_ROOT/bin/carina-daemon" -h 2>&1 | head -5 || true
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Build candidate URL list.
# Mirrors prefix the full origin URL (common GH proxy pattern).
# Override: CARINA_RELEASE_URL=... (single) or CARINA_RELEASE_MIRRORS="m1 m2"
urls=()
if [ -n "${CARINA_RELEASE_URL:-}" ]; then
  urls+=("$CARINA_RELEASE_URL")
fi

# Default CN-friendly proxies (order: historically faster → origin).
# Operators can replace entirely via CARINA_RELEASE_MIRRORS.
DEFAULT_MIRRORS=(
  "https://ghfast.top/"
  "https://ghproxy.net/"
  "https://mirror.ghproxy.com/"
  "https://gitdl.cn/"
  "https://gh.ddlc.top/"
)

if [ -n "${CARINA_RELEASE_MIRRORS:-}" ]; then
  # shellcheck disable=SC2206
  DEFAULT_MIRRORS=($CARINA_RELEASE_MIRRORS)
fi

for m in "${DEFAULT_MIRRORS[@]}"; do
  # Accept either full URL or prefix mirror
  case "$m" in
    http*"$ASSET"*) urls+=("$m") ;;
    */) urls+=("${m}${ORIGIN_URL#https://}") ;; # some mirrors want host path without scheme re-add
  esac
done

# Fix prefix mirrors: standard pattern is mirror + full https://github.com/...
urls=()
if [ -n "${CARINA_RELEASE_URL:-}" ]; then
  urls+=("$CARINA_RELEASE_URL")
fi
if [ -n "${CARINA_RELEASE_MIRRORS:-}" ]; then
  # shellcheck disable=SC2206
  for m in $CARINA_RELEASE_MIRRORS; do
    case "$m" in
      */) urls+=("${m}${ORIGIN_URL}") ;;
      *) urls+=("${m%/}/${ORIGIN_URL}") ;;
    esac
  done
else
  for m in \
    "https://ghfast.top/" \
    "https://ghproxy.net/" \
    "https://mirror.ghproxy.com/" \
    "https://gitdl.cn/" \
    "https://gh.ddlc.top/"
  do
    urls+=("${m}${ORIGIN_URL}")
  done
fi
# Always try origin last (US/global).
urls+=("$ORIGIN_URL")

download_ok=0
for URL in "${urls[@]}"; do
  echo "Trying $URL"
  # Short per-attempt budget so we rotate mirrors quickly on CN links.
  if curl -fsSL \
      --connect-timeout 15 \
      --max-time 120 \
      --retry 1 \
      --retry-delay 2 \
      -A "nebutra-carina-install/1.0" \
      "$URL" -o "$TMP/$ASSET"; then
    # Basic sanity: gzip/tar magic, non-empty
    if [ -s "$TMP/$ASSET" ] && tar -tzf "$TMP/$ASSET" >/dev/null 2>&1; then
      echo "Downloaded via $URL"
      download_ok=1
      break
    fi
    echo "  bad archive from $URL — try next"
    rm -f "$TMP/$ASSET"
  else
    echo "  failed — try next"
    rm -f "$TMP/$ASSET"
  fi
done

if [ "$download_ok" != "1" ]; then
  echo "ERROR: failed to download $ASSET from all mirrors + origin" >&2
  echo "Hint: set CARINA_RELEASE_URL or stage binary at $STAGED" >&2
  exit 1
fi

tar -xzf "$TMP/$ASSET" -C "$TMP"

BIN="$(find "$TMP" -type f -name 'carina-daemon' | head -1)"
if [ -z "$BIN" ]; then
  echo "carina-daemon not found in archive" >&2
  ls -laR "$TMP" >&2 || true
  exit 1
fi
install -m 0755 "$BIN" "$CARINA_ROOT/bin/carina-daemon"

for name in carina carina-cli; do
  C="$(find "$TMP" -type f -name "$name" | head -1 || true)"
  if [ -n "$C" ]; then
    install -m 0755 "$C" "$CARINA_ROOT/bin/$name"
  fi
done

echo "Installed $CARINA_ROOT/bin/carina-daemon (v${CARINA_VERSION})"
"$CARINA_ROOT/bin/carina-daemon" -h 2>&1 | head -5 || true

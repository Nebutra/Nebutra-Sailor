#!/usr/bin/env bash
# Install carina-daemon binary for same-host Track-B co-deploy with api-gateway.
#
# Default layout:
#   /var/carina/bin/carina-daemon
#   /var/carina/run/daemon.sock   (created at runtime)
#   /var/carina/ws               (workspace root)
#   /var/carina/state            (session/event storage)
#
# Usage (on the VM):
#   sudo bash install-carina-daemon.sh
#   CARINA_VERSION=0.8.1 bash install-carina-daemon.sh
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
URL="${CARINA_RELEASE_URL:-https://github.com/Nebutra/carina/releases/download/v${CARINA_VERSION}/${ASSET}}"

mkdir -p "$CARINA_ROOT/bin" "$CARINA_ROOT/run" "$CARINA_ROOT/ws" "$CARINA_ROOT/state" "$CARINA_ROOT/tmp"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading $URL"
# Hard timeouts — GH Actions SSH session must not hang forever on a bad release CDN.
if ! curl -fsSL --connect-timeout 20 --max-time 180 --retry 2 --retry-delay 3     "$URL" -o "$TMP/$ASSET"; then
  echo "ERROR: failed to download $URL" >&2
  exit 1
fi
tar -xzf "$TMP/$ASSET" -C "$TMP"

# tarball layout may nest binaries; find carina-daemon
BIN="$(find "$TMP" -type f -name 'carina-daemon' | head -1)"
if [ -z "$BIN" ]; then
  echo "carina-daemon not found in archive" >&2
  ls -laR "$TMP" >&2 || true
  exit 1
fi
install -m 0755 "$BIN" "$CARINA_ROOT/bin/carina-daemon"

# optional CLI helpers
for name in carina carina-cli; do
  C="$(find "$TMP" -type f -name "$name" | head -1 || true)"
  if [ -n "$C" ]; then
    install -m 0755 "$C" "$CARINA_ROOT/bin/$name"
  fi
done

echo "Installed $CARINA_ROOT/bin/carina-daemon (v${CARINA_VERSION})"
"$CARINA_ROOT/bin/carina-daemon" -h 2>&1 | head -5 || true

#!/usr/bin/env bash
# Install carina-daemon + carina-kernel-service for same-host Track-B co-deploy.
#
# Default layout:
#   /var/carina/bin/carina-daemon
#   /var/carina/bin/carina-kernel-service   (required — daemon spawns this)
#   /var/carina/bin/carina-*               (optional zig native tools)
#   /var/carina/run/daemon.sock            (created at runtime)
#   /var/carina/ws                         (workspace root)
#   /var/carina/state                      (session/event storage)
#
# Download order (fastest path first for CN ECS):
#   1) CI-staged binaries at /tmp/carina-ops/{carina-daemon,carina-kernel-service}
#   2) CARINA_RELEASE_URL (explicit override)
#   3) GitHub release via CN-friendly mirrors, then origin
#
# Usage (on the VM):
#   sudo bash install-carina-daemon.sh
#   CARINA_VERSION=0.8.5 bash install-carina-daemon.sh
#   CARINA_RELEASE_MIRRORS="https://ghfast.top/ https://ghproxy.net/" bash install-carina-daemon.sh
#
# Version resolution (first hit wins):
#   1) CARINA_VERSION env
#   2) staged /tmp/carina-ops/VERSION (CI)
#   3) infra/ops/carina.pin (repo single source of truth)
#   4) hard fallback (last known good in script; prefer pin)
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
CARINA_ROOT="${CARINA_ROOT:-/var/carina}"
STAGED_DIR="${CARINA_STAGED_DIR:-/tmp/carina-ops}"
STAGED_DAEMON="${CARINA_STAGED_BIN:-$STAGED_DIR/carina-daemon}"
STAGED_KERNEL="${CARINA_STAGED_KERNEL:-$STAGED_DIR/carina-kernel-service}"

if [ -z "${CARINA_VERSION:-}" ] && [ -f "$STAGED_DIR/VERSION" ]; then
  CARINA_VERSION="$(tr -d '[:space:]' <"$STAGED_DIR/VERSION")"
fi
if [ -z "${CARINA_VERSION:-}" ] && [ -f "$SCRIPTS_DIR/carina-version.sh" ]; then
  # shellcheck source=carina-version.sh
  source "$SCRIPTS_DIR/carina-version.sh"
  CARINA_VERSION="$(carina_version_from_pin 2>/dev/null || true)"
fi
# staged carina.pin may be uploaded next to install scripts
if [ -z "${CARINA_VERSION:-}" ] && [ -f "$STAGED_DIR/carina.pin" ]; then
  CARINA_VERSION="$(grep -E '^version=' "$STAGED_DIR/carina.pin" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
fi
CARINA_VERSION="${CARINA_VERSION:-0.8.6}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH_TAG="linux_amd64" ;;
  aarch64|arm64) ARCH_TAG="linux_arm64" ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac

ASSET="carina_${CARINA_VERSION}_${ARCH_TAG}.tar.gz"
ORIGIN_URL="https://github.com/Nebutra/carina/releases/download/v${CARINA_VERSION}/${ASSET}"

mkdir -p "$CARINA_ROOT/bin" "$CARINA_ROOT/run" "$CARINA_ROOT/ws" "$CARINA_ROOT/state" "$CARINA_ROOT/tmp"

install_bin() {
  local src="$1" dest="$2"
  install -m 0755 "$src" "$dest"
  echo "Installed $dest"
}

# Prefer CI-staged binaries (avoids any GH→China download).
staged_ok=0
if [ -f "$STAGED_DAEMON" ] && [ -s "$STAGED_DAEMON" ]; then
  install_bin "$STAGED_DAEMON" "$CARINA_ROOT/bin/carina-daemon"
  staged_ok=1
fi
if [ -f "$STAGED_KERNEL" ] && [ -s "$STAGED_KERNEL" ]; then
  install_bin "$STAGED_KERNEL" "$CARINA_ROOT/bin/carina-kernel-service"
fi
# Optional zig tools staged as /tmp/carina-ops/tools/carina-*
if [ -d "$STAGED_DIR/tools" ]; then
  for t in "$STAGED_DIR"/tools/carina-*; do
    [ -f "$t" ] || continue
    install_bin "$t" "$CARINA_ROOT/bin/$(basename "$t")"
  done
fi

need_archive=0
if [ ! -x "$CARINA_ROOT/bin/carina-daemon" ] || [ ! -x "$CARINA_ROOT/bin/carina-kernel-service" ]; then
  need_archive=1
fi

if [ "$need_archive" = "0" ]; then
  printf '%s\n' "$CARINA_VERSION" >"$CARINA_ROOT/VERSION"
  echo "Carina binaries ready under $CARINA_ROOT/bin (staged path, v${CARINA_VERSION})"
  "$CARINA_ROOT/bin/carina-daemon" -h 2>&1 | head -8 || true
  exit 0
fi

if [ "$staged_ok" = "1" ] && [ ! -x "$CARINA_ROOT/bin/carina-kernel-service" ]; then
  echo "Staged carina-daemon present but carina-kernel-service missing — fetching full release archive"
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
  echo "Hint: set CARINA_RELEASE_URL or stage binaries at $STAGED_DIR" >&2
  exit 1
fi

tar -xzf "$TMP/$ASSET" -C "$TMP"

BIN="$(find "$TMP" -type f -name 'carina-daemon' | head -1)"
if [ -z "$BIN" ]; then
  echo "carina-daemon not found in archive" >&2
  ls -laR "$TMP" >&2 || true
  exit 1
fi
install_bin "$BIN" "$CARINA_ROOT/bin/carina-daemon"

KERNEL="$(find "$TMP" -type f -name 'carina-kernel-service' | head -1)"
if [ -z "$KERNEL" ]; then
  echo "ERROR: carina-kernel-service not found in archive (required by carina-daemon)" >&2
  ls -laR "$TMP" >&2 || true
  exit 1
fi
install_bin "$KERNEL" "$CARINA_ROOT/bin/carina-kernel-service"

# CLI helpers + zig native tools (carina-scan, carina-patch, …) live next to daemon.
for name in carina carina-cli carina-worker; do
  C="$(find "$TMP" -type f -name "$name" | head -1 || true)"
  if [ -n "$C" ]; then
    install_bin "$C" "$CARINA_ROOT/bin/$name"
  fi
done
while IFS= read -r -d '' tool; do
  base="$(basename "$tool")"
  case "$base" in
    carina-daemon|carina-kernel-service|carina|carina-cli|carina-worker|carina-tui|carina-ui) continue ;;
  esac
  install_bin "$tool" "$CARINA_ROOT/bin/$base"
done < <(find "$TMP" -type f -name 'carina-*' -print0 2>/dev/null || true)

if [ ! -x "$CARINA_ROOT/bin/carina-daemon" ] || [ ! -x "$CARINA_ROOT/bin/carina-kernel-service" ]; then
  echo "ERROR: incomplete install under $CARINA_ROOT/bin" >&2
  ls -la "$CARINA_ROOT/bin" >&2 || true
  exit 1
fi

printf '%s\n' "$CARINA_VERSION" >"$CARINA_ROOT/VERSION"
echo "Installed carina-daemon + carina-kernel-service (v${CARINA_VERSION}) → $CARINA_ROOT/bin"
"$CARINA_ROOT/bin/carina-daemon" -h 2>&1 | head -8 || true

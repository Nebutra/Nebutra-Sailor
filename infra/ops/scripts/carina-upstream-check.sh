#!/usr/bin/env bash
# Compare infra/ops/carina.pin against the latest Nebutra/carina release.
#
# Exit codes:
#   0  pin is current (or only --print)
#   2  pin is behind latest (for CI to open a PR)
#   1  hard error
#
# Flags:
#   --print     only print pin / latest / status
#   --write     rewrite carina.pin version= to latest (used by CI bot)
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=carina-version.sh
source "$SCRIPTS_DIR/carina-version.sh"

PRINT_ONLY=0
WRITE=0
for arg in "$@"; do
  case "$arg" in
    --print) PRINT_ONLY=1 ;;
    --write) WRITE=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

PIN_FILE="$(carina_pin_file)"
PINNED="$(carina_version_from_pin)"
CHANNEL="$(carina_pin_field channel 2>/dev/null || true)"
REPO="$(carina_pin_field repository 2>/dev/null || echo Nebutra/carina)"
export CARINA_REPOSITORY="$REPO"
LATEST="$(carina_latest_release "$CHANNEL")"

if [ -z "$LATEST" ]; then
  echo "ERROR: could not resolve latest release for $REPO (channel=${CHANNEL:-*})" >&2
  exit 1
fi

status="current"
if [ "$PINNED" != "$LATEST" ]; then
  status="behind"
fi

echo "repository: $REPO"
echo "channel:    ${CHANNEL:-(any)}"
echo "pinned:     $PINNED"
echo "latest:     $LATEST"
echo "status:     $status"
echo "pin_file:   $PIN_FILE"

if [ "$PRINT_ONLY" = "1" ]; then
  exit 0
fi

if [ "$status" = "current" ]; then
  exit 0
fi

if [ "$WRITE" = "1" ]; then
  tmp="$(mktemp)"
  awk -v v="$LATEST" '
    BEGIN{FS=OFS="="}
    $1=="version" {$2=v}
    {print}
  ' "$PIN_FILE" >"$tmp"
  mv "$tmp" "$PIN_FILE"
  echo "Updated $PIN_FILE version=$LATEST"
  exit 2
fi

exit 2

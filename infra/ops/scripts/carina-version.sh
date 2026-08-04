#!/usr/bin/env bash
# Resolve the Carina co-deploy binary version from infra/ops/carina.pin.
#
# Usage:
#   source infra/ops/scripts/carina-version.sh
#   carina_version_from_pin          # → 0.8.5
#   carina_pin_field channel         # → 0.8
#   carina_pin_field repository      # → Nebutra/carina
#   carina_latest_release [channel]  # → latest GH release (optionally filtered)
#
# Library-style: do not enable `set -u` here (safe to source from zsh/bash).

_carina_script_dir() {
  # Resolve this file's directory under bash, zsh, or plain sh ($0).
  if [ -n "${BASH_SOURCE[0]:-}" ]; then
    cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
    return 0
  fi
  if [ -n "${ZSH_VERSION:-}" ]; then
    # shellcheck disable=SC2296
    cd "$(dirname "${(%):-%x}")" && pwd
    return 0
  fi
  cd "$(dirname "$0")" && pwd
}

carina_pin_file() {
  if [ -n "${CARINA_PIN_FILE:-}" ] && [ -f "$CARINA_PIN_FILE" ]; then
    printf '%s\n' "$CARINA_PIN_FILE"
    return 0
  fi
  local here
  here="$(_carina_script_dir)"
  # scripts/ → ops/
  if [ -f "$here/../carina.pin" ]; then
    printf '%s\n' "$here/../carina.pin"
    return 0
  fi
  if [ -f "infra/ops/carina.pin" ]; then
    printf '%s\n' "infra/ops/carina.pin"
    return 0
  fi
  if [ -f "/tmp/carina-ops/carina.pin" ]; then
    printf '%s\n' "/tmp/carina-ops/carina.pin"
    return 0
  fi
  return 1
}

carina_pin_field() {
  local key="$1"
  local pin
  pin="$(carina_pin_file)" || {
    echo "carina.pin not found (set CARINA_PIN_FILE=...)" >&2
    return 1
  }
  # shellcheck disable=SC2002
  local val
  val="$(grep -E "^${key}=" "$pin" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
  if [ -z "$val" ]; then
    echo "carina.pin missing key: $key" >&2
    return 1
  fi
  printf '%s\n' "$val"
}

carina_version_from_pin() {
  if [ -n "${CARINA_VERSION:-}" ]; then
    printf '%s\n' "$CARINA_VERSION"
    return 0
  fi
  carina_pin_field version
}

# Latest published non-draft, non-prerelease tag on GitHub (without leading v).
# Optional channel filter: channel=0.8 → only 0.8.x.
carina_latest_release() {
  local channel="${1:-}"
  local repo
  repo="${CARINA_REPOSITORY:-}"
  if [ -z "$repo" ]; then
    repo="$(carina_pin_field repository 2>/dev/null || echo Nebutra/carina)"
  fi
  if [ -z "$channel" ]; then
    channel="$(carina_pin_field channel 2>/dev/null || true)"
  fi

  local api="https://api.github.com/repos/${repo}/releases?per_page=30"
  local json
  if command -v gh >/dev/null 2>&1; then
    json="$(gh api "repos/${repo}/releases?per_page=30" 2>/dev/null || true)"
  fi
  if [ -z "${json:-}" ]; then
    json="$(curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$api")"
  fi

  # Prefer jq; fall back to node.
  if command -v jq >/dev/null 2>&1; then
    if [ -n "$channel" ]; then
      printf '%s' "$json" | jq -r --arg c "$channel" '
        [.[] | select(.draft==false and .prerelease==false)
          | .tag_name | ltrimstr("v")
          | select(test("^" + ($c | gsub("\\."; "\\.")) + "\\."))]
        | .[0] // empty'
    else
      printf '%s' "$json" | jq -r '
        [.[] | select(.draft==false and .prerelease==false)
          | .tag_name | ltrimstr("v")]
        | .[0] // empty'
    fi
    return 0
  fi

  node --input-type=module -e '
const channel = process.env.CHANNEL || "";
const data = JSON.parse(process.argv[1]);
const tags = data
  .filter((r) => !r.draft && !r.prerelease)
  .map((r) => String(r.tag_name || "").replace(/^v/, ""));
const hit = channel
  ? tags.find((t) => t.startsWith(channel + "."))
  : tags[0];
if (hit) process.stdout.write(hit);
' "$json"
}

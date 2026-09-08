#!/usr/bin/env bash
# Smoke the OpenAI-compatible surface behind one key.
# Default target is local New-API; point BASE at https://router.nebutra.com/v1
# and TOKEN at a Nebutra key to smoke the public edge.
#
#   NEW_API_ACCESS_TOKEN=... scripts/smoke-chat.sh
#   BASE=https://router.nebutra.com/v1 TOKEN=sk-sailor-... MODEL=gpt-5 scripts/smoke-chat.sh
set -euo pipefail

BASE="${BASE:-${NEW_API_BASE_URL:-http://127.0.0.1:3001}}"
BASE="${BASE%/}"
case "$BASE" in */v1) ;; *) BASE="$BASE/v1" ;; esac
TOKEN="${TOKEN:-${NEW_API_ACCESS_TOKEN:-}}"
MODEL="${MODEL:-gpt-4o-mini}"
ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-sonnet-4-5}"

if [[ -z "$TOKEN" ]]; then
  echo "Set TOKEN (a Nebutra key) or NEW_API_ACCESS_TOKEN (New-API user token) first."
  exit 1
fi

probe() {
  local label="$1"; shift
  echo "== $label"
  curl -sS --max-time 60 "$@" | head -c 600
  echo
}

probe "GET /models" "$BASE/models" -H "Authorization: Bearer $TOKEN"

probe "POST /chat/completions" -X POST "$BASE/chat/completions" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":16}"

probe "POST /responses" -X POST "$BASE/responses" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"input\":\"ping\",\"max_output_tokens\":16}"

# Anthropic wire format: x-api-key instead of Bearer, anthropic-version required.
probe "POST /messages (x-api-key)" -X POST "$BASE/messages" \
  -H "x-api-key: $TOKEN" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" \
  -d "{\"model\":\"$ANTHROPIC_MODEL\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}"

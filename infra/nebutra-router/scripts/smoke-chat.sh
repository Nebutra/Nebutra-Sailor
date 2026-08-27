#!/usr/bin/env bash
# Smoke: hit local New-API OpenAI-compatible chat if token is set.
set -euo pipefail

BASE="${NEW_API_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${NEW_API_ACCESS_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Set NEW_API_ACCESS_TOKEN first (create token in New-API admin)."
  exit 1
fi

curl -sS -X POST "${BASE%/}/v1/chat/completions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"ping"}],
    "max_tokens": 16
  }' | head -c 2000
echo

#!/usr/bin/env bash
set -euo pipefail
TOKEN="${CLOUDFLARE_API_TOKEN:?}"
ZONE=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/zones?name=nebutra.com" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"][0]["id"])')
echo "ZONE=$ZONE"

echo "=== DNS docs ==="
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records?name=docs.nebutra.com" | python3 -m json.tool | head -40

echo "=== Redirect Rules (rulesets http_request_dynamic_redirect) ==="
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/rulesets/phases/http_request_dynamic_redirect/entrypoint" | python3 -m json.tool | head -120

echo "=== Page Rules ==="
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/pagerules" | python3 -m json.tool | head -80

echo "=== Bulk Redirects? lists ==="
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/rules/lists?kind=redirect" | python3 -m json.tool | head -40

echo "=== Workers routes ==="
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/workers/routes" | python3 -m json.tool | head -60

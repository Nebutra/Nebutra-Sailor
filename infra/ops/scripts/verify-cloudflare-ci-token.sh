#!/usr/bin/env bash
# Verify CLOUDFLARE_API_TOKEN (or CLOUDFLARE_WORKERS_API_TOKEN) can deploy Workers
# and optionally edit DNS for nebutra.com.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=… bash infra/ops/scripts/verify-cloudflare-ci-token.sh
#   CLOUDFLARE_API_TOKEN=… VERIFY_DNS=1 bash infra/ops/scripts/verify-cloudflare-ci-token.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_WORKERS_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_WORKERS_API_TOKEN" >&2
  exit 1
fi

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-a4248a5738df319996a70092fe598d37}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
WORKER_NAME="${CF_WORKER_NAME:-nebutra-sailor-docs}"

auth() { curl -sS -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" "$@"; }

echo "=== 1) token verify ==="
VERIFY=$(auth "https://api.cloudflare.com/client/v4/user/tokens/verify")
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

echo "=== 2) account access (${ACCOUNT_ID}) ==="
ACC=$(auth "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}")
echo "$ACC" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("account", d.get("success"), (d.get("result") or {}).get("name"), d.get("errors"))'

echo "=== 3) list workers scripts (needs Workers Scripts Read/Edit) ==="
SCRIPTS=$(auth "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts")
echo "$SCRIPTS" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("scripts_list", d.get("success"), "count", len(d.get("result") or []), d.get("errors"))
if not d.get("success"):
  sys.exit(2)
'

echo "=== 4) assets-upload-session probe (needs Workers Scripts Edit) ==="
# Empty manifest probe: Edit scope should not return 10000 auth error.
# 400/404 on bad body is fine — we only care about auth.
PROBE=$(curl -sS -o /tmp/cf-assets-probe.json -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/assets-upload-session" \
  --data '{"manifest":{}}' || echo "000")
echo "http_status=$PROBE body=$(head -c 240 /tmp/cf-assets-probe.json 2>/dev/null || true)"
if [ "$PROBE" = "000" ]; then
  echo "::error::assets-upload-session request failed network-level"
  exit 3
fi
if python3 -c '
import json, sys
try:
  d = json.load(open("/tmp/cf-assets-probe.json"))
except Exception:
  sys.exit(2)
errs = d.get("errors") or []
if any(e.get("code") == 10000 for e in errs):
  sys.exit(1)
# success, or non-auth API error (empty manifest, missing script, etc.) is fine
sys.exit(0)
'; then
  echo "assets_upload_session: auth OK (or non-auth error — acceptable for probe)"
else
  echo "::error::assets-upload-session returned Authentication error 10000 — token lacks Workers Scripts Edit"
  echo "Create token: https://dash.cloudflare.com/profile/api-tokens"
  echo "Template: Edit Cloudflare Workers + Zone DNS Edit for nebutra.com"
  echo "See docs/ops/cloudflare-ci-token.md"
  exit 4
fi

if [ "${VERIFY_DNS:-0}" = "1" ]; then
  echo "=== 5) DNS write probe (needs Zone DNS Edit) ==="
  ZONE_ID="${CF_ZONE_ID:-}"
  if [ -z "$ZONE_ID" ]; then
    ZJ=$(auth "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}&account.id=${ACCOUNT_ID}")
    ZONE_ID=$(echo "$ZJ" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
  fi
  [ -n "$ZONE_ID" ] || { echo "zone id missing"; exit 5; }
  # Dry-run style: GET records is Read; attempt PUT with invalid id is not useful.
  # Create then delete a disposable TXT _nebutra_ci_probe
  BODY='{"type":"TXT","name":"_nebutra_ci_probe","content":"ok","ttl":120}'
  CREATE=$(curl -sS -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" --data "$BODY")
  echo "$CREATE" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns_create", d.get("success"), d.get("errors")); raise SystemExit(0 if d.get("success") else 6)'
  RID=$(echo "$CREATE" | python3 -c 'import json,sys; print((json.load(sys.stdin).get("result") or {}).get("id",""))')
  if [ -n "$RID" ]; then
    curl -sS -X DELETE -H "Authorization: Bearer ${TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" >/dev/null
    echo "dns_probe cleaned"
  fi
fi

echo "=== OK: token looks sufficient for Workers CI ==="
echo "Docs: docs/ops/cloudflare-ci-token.md"

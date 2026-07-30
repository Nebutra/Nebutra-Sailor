#!/usr/bin/env bash
# Upsert pebble.nebutra.com → cname.vercel-dns.com (proxied orange-cloud).
# Brand front only — no ECS origin. See docs/DOMAINS.md and topology.defaults.yaml.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="pebble.${ZONE_NAME}"
CONTENT="${PEBBLE_DNS_TARGET:-cname.vercel-dns.com}"
ACC="${CLOUDFLARE_ACCOUNT_ID:-}"

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer ${TOKEN}" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

if [ -n "${CF_ZONE_ID:-}" ]; then
  ZONE_ID="$CF_ZONE_ID"
else
  QUERY="name=${ZONE_NAME}"
  if [ -n "$ACC" ]; then
    QUERY="${QUERY}&account.id=${ACC}"
  fi
  ZONE_JSON=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?${QUERY}")
  ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
fi
[ -n "$ZONE_ID" ] || { echo "zone missing for ${ZONE_NAME} (set CF_ZONE_ID)"; exit 1; }
echo "ZONE_ID=${ZONE_ID} HOST=${HOST} → ${CONTENT}"

auth_get() { curl -sS -H "Authorization: Bearer ${TOKEN}" "$1"; }

echo "=== existing pebble records ==="
EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}")
echo "$EXIST" | python3 -m json.tool | head -40

BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'pebble','content':'${CONTENT}','proxied':True,'ttl':1,'comment':'Pebble brand front (Vercel)'}))")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXIST")

tmp="$(mktemp)"
if [ -n "$RID" ]; then
  curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" -o "$tmp"
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns put", d.get("success"), d.get("errors")); assert d.get("success"), d' <"$tmp"
else
  curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" -o "$tmp"
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns post", d.get("success"), d.get("errors")); assert d.get("success"), d' <"$tmp"
fi
rm -f "$tmp"

echo "=== smoke (DNS may still be propagating) ==="
curl -sSI --max-time 20 "https://${HOST}/" | head -20 || true
echo "done"

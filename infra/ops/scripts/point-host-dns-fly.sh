#!/usr/bin/env bash
# Point a nebutra.com hostname at a Fly app (proxied CNAME → <app>.fly.dev).
# Usage: HOST=forge FLY_APP=nebutra-forge ./infra/ops/scripts/point-host-dns-fly.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="${HOST:?HOST is the DNS label, e.g. forge}"
FLY_APP="${FLY_APP:?FLY_APP is the Fly app name, e.g. nebutra-forge}"
TARGET="${FLY_APP}.fly.dev"
FQDN="${HOST}.${ZONE_NAME}"

ZONE_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")
ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "zone missing: $ZONE_JSON"; exit 1; }

delete_type() {
  local type="$1"
  local exist rid
  exist=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${FQDN}&type=${type}")
  rid=$(echo "$exist" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
  if [ -n "$rid" ]; then
    curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" >/dev/null
  fi
}

delete_type A
delete_type AAAA

BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'${HOST}','content':'${TARGET}','proxied':True,'ttl':1,'comment':'fly ${FLY_APP}'}))")
EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${FQDN}&type=CNAME")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

if [ -n "$RID" ]; then
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d.get("errors") or d; print("cname", d["result"]["name"], d["result"]["content"])'

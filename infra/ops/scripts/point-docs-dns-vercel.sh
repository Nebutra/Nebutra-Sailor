#!/usr/bin/env bash
# One-time / rare: point docs.nebutra.com at Vercel (CNAME cname.vercel-dns.com).
# Requires CLOUDFLARE_API_TOKEN with Zone.DNS edit on nebutra.com.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
RECORD_NAME="docs"
TARGET="${DOCS_DNS_TARGET:-cname.vercel-dns.com}"

ZONE_ID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
[ -n "$ZONE_ID" ] || { echo "zone $ZONE_NAME not found" >&2; exit 1; }

EXISTING=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}.${ZONE_NAME}")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXISTING")
BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'$RECORD_NAME','content':'$TARGET','proxied':True,'ttl':1}))")

if [ -n "$RID" ]; then
  curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}"
else
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"
fi
echo
echo "docs.${ZONE_NAME} → ${TARGET} (proxied)"

#!/usr/bin/env bash
# Point kuanlan.nebutra.com → ECS origin (A, proxied). Drops a leftover Vercel CNAME.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ECS_HOST:-106.15.4.31}"
HOST="kuanlan.${ZONE_NAME}"
ACC="${CLOUDFLARE_ACCOUNT_ID:-}"

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -m json.tool | head -50
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

if [ -n "${CF_ZONE_ID:-}" ]; then
  ZONE_ID="$CF_ZONE_ID"
else
  QUERY="name=${ZONE_NAME}"
  if [ -n "$ACC" ]; then
    QUERY="${QUERY}&account.id=${ACC}"
  fi
  ZONE_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?${QUERY}")
  echo "=== zone lookup ==="
  echo "$ZONE_JSON" | python3 -m json.tool | head -40
  ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
fi
[ -n "$ZONE_ID" ] || { echo "zone missing for ${ZONE_NAME} (set CF_ZONE_ID if token cannot list zones)"; exit 1; }
echo "ZONE_ID=$ZONE_ID ORIGIN_IP=$ORIGIN_IP HOST=$HOST"

BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'kuanlan','content':'${ORIGIN_IP}','proxied':True,'ttl':1,'comment':'nebutra-kuanlan product edge'}))")
EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=A")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

CNAME_EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=CNAME")
CNAME_RID=$(echo "$CNAME_EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
if [ -n "$CNAME_RID" ]; then
  echo "=== DELETE conflicting CNAME $CNAME_RID ==="
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${CNAME_RID}" | python3 -m json.tool | head -20
fi

if [ -n "$RID" ]; then
  echo "=== PUT existing A $RID ==="
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  echo "=== POST new A kuanlan ==="
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -m json.tool | head -60
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin);
ok=d.get("success"); print("dns_write_success", ok);
assert ok, d.get("errors") or d'

echo "=== verify DoH ==="
sleep 3
__cf_tmp="$(mktemp)"
curl -sS "https://cloudflare-dns.com/dns-query?name=${HOST}&type=A" -H "accept: application/dns-json" -o "$__cf_tmp"
python3 -m json.tool <"$__cf_tmp" | head -30
rm -f "$__cf_tmp"
echo "done"

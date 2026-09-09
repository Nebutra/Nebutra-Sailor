#!/usr/bin/env bash
# Point <DNS_HOST>.nebutra.com → a Fly Machine app (proxied CNAME to <FLY_APP>.fly.dev).
#
# Generic because every Fly product edge takes the same shape (docs/ops/nebutra/fly-origin.md):
# an orange-cloud CNAME onto the app's own hostname, never onto a shared alias. Run
# `fly certs add <host>.nebutra.com` first, or Cloudflare answers 525.
#
# Env: CLOUDFLARE_API_TOKEN (Zone DNS Edit), DNS_HOST, FLY_APP,
#      optional CF_ZONE_ID / CF_ZONE_NAME / CLOUDFLARE_ACCOUNT_ID.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
SUB="${DNS_HOST:?DNS_HOST required}"
APP="${FLY_APP:?FLY_APP required}"
HOST="${SUB}.${ZONE_NAME}"
TARGET="${APP}.fly.dev"
ACC="${CLOUDFLARE_ACCOUNT_ID:-}"

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

if [ -n "${CF_ZONE_ID:-}" ]; then
  ZONE_ID="$CF_ZONE_ID"
else
  QUERY="name=${ZONE_NAME}"
  [ -n "$ACC" ] && QUERY="${QUERY}&account.id=${ACC}"
  ZONE_ID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?${QUERY}" \
    | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or [{}]; print(r[0].get("id",""))')
fi
[ -n "$ZONE_ID" ] || { echo "zone missing for ${ZONE_NAME} (set CF_ZONE_ID if the token cannot list zones)"; exit 1; }
echo "ZONE_ID=$ZONE_ID HOST=$HOST TARGET=$TARGET"

# An A record left from an earlier topology would win over the CNAME — drop it.
A_RID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=A" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
if [ -n "$A_RID" ]; then
  echo "=== DELETE conflicting A $A_RID ==="
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${A_RID}" | python3 -m json.tool | head -10
fi

BODY=$(DNS_SUB="$SUB" DNS_TARGET_HOST="$TARGET" DNS_APP="$APP" python3 -c "
import json, os
print(json.dumps({
    'type': 'CNAME',
    'name': os.environ['DNS_SUB'],
    'content': os.environ['DNS_TARGET_HOST'],
    'proxied': True,
    'ttl': 1,
    'comment': f\"{os.environ['DNS_APP']} product edge\",
}))
")
RID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=CNAME" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

if [ -n "$RID" ]; then
  echo "=== PUT existing CNAME $RID ==="
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  echo "=== POST new CNAME ${SUB} ==="
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -m json.tool | head -40
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin);
ok=d.get("success"); print("dns_write_success", ok);
assert ok, d.get("errors") or d'

echo "=== verify DoH ==="
sleep 3
__cf_tmp="$(mktemp)"
curl -sS "https://cloudflare-dns.com/dns-query?name=${HOST}&type=A" -H "accept: application/dns-json" -o "$__cf_tmp"
python3 -m json.tool <"$__cf_tmp" | head -20
rm -f "$__cf_tmp"
echo "done"

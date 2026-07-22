#!/usr/bin/env bash
# Point auth.nebutra.com → ECS origin (A, proxied).
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ECS_HOST:-106.15.4.31}"
HOST="auth.${ZONE_NAME}"

auth() {
  local method=${1:-GET}; shift
  if [ "$method" = "GET" ]; then
    curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"
  else
    curl -sS -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"
  fi
}

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -m json.tool | head -50
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

ZONE_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")
ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "zone missing: $ZONE_JSON"; exit 1; }
echo "ZONE_ID=$ZONE_ID ORIGIN_IP=$ORIGIN_IP HOST=$HOST"

# Permission probe: list DNS for app (read)
echo "=== probe list app DNS ==="
LIST_APP=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=app.${ZONE_NAME}&per_page=5")
echo "$LIST_APP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("list_success", d.get("success"), "errors", d.get("errors"), "count", len(d.get("result") or []))'

BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'auth','content':'${ORIGIN_IP}','proxied':True,'ttl':1,'comment':'auth-center login UX'}))")
EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=A")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

if [ -n "$RID" ]; then
  echo "=== PUT existing $RID ==="
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  echo "=== POST new A auth ==="
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -m json.tool | head -60
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); 
ok=d.get("success"); print("dns_write_success", ok);
assert ok, d.get("errors") or d'

echo "=== verify DoH ==="
sleep 3
curl -sS "https://cloudflare-dns.com/dns-query?name=${HOST}&type=A" -H "accept: application/dns-json" | python3 -m json.tool | head -30
echo "done"

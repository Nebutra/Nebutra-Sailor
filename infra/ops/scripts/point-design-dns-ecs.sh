#!/usr/bin/env bash
# Point design.nebutra.com → ECS origin (A, proxied).
# Origin: PM2 design :3109 + nginx conf.d/design.nebutra.com.conf
#
# Without a design server_name (or when DNS points nowhere useful), the
# default 443 block 301s to nebutra.com. Without PM2 on :3004, CF returns 502.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ECS_HOST:-106.15.4.31}"
HOST="design.${ZONE_NAME}"
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
echo "ZONE_ID=${ZONE_ID} ORIGIN_IP=${ORIGIN_IP} HOST=${HOST}"

# Drop CNAME leftovers so A can own the name.
for rtype in CNAME AAAA; do
  EXIST=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=${rtype}")
  while read -r rid; do
    [ -z "$rid" ] && continue
    echo "=== DELETE ${rtype} $rid ==="
    curl -sS -X DELETE -H "Authorization: Bearer ${TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print("deleted", d.get("success"), d.get("errors"))'
  done < <(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print("\n".join(x["id"] for x in r))')
done

BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'design','content':'${ORIGIN_IP}','proxied':True,'ttl':1}))")
EXIST=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=A")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

tmp="$(mktemp)"
if [ -n "$RID" ]; then
  curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" -o "$tmp"
else
  curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" -o "$tmp"
fi
python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
print("dns_write", d.get("success"), d.get("errors"))
if not d.get("success"):
    raise SystemExit(1)
r=d.get("result") or {}
print(r.get("type"), r.get("name"), "->", r.get("content"), "proxied=", r.get("proxied"))
' "$tmp"
rm -f "$tmp"

echo "=== smoke (origin needs PM2 design :3109) ==="
curl -sSI --max-time 20 "https://${HOST}/" | head -20 || true
echo "done"

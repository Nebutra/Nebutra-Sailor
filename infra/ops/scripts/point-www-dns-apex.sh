#!/usr/bin/env bash
# Upsert www.nebutra.com → apex (CNAME, orange-cloud) so marketing aliases work.
# Root cause of #185: apex /refer was fine; www was NXDOMAIN (no DNS record).
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="www.${ZONE_NAME}"
# CNAME to apex hostname; CF flattens CNAME-at-apex-alias for www → zone apex.
CONTENT="${WWW_DNS_TARGET:-${ZONE_NAME}}"

ZONE_ID=$(
  tmp="$(mktemp)"
  curl -sS -H "Authorization: Bearer ${TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" -o "$tmp"
  python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <"$tmp"
  rm -f "$tmp"
)
[ -n "$ZONE_ID" ] || { echo "zone missing for ${ZONE_NAME}"; exit 1; }
echo "ZONE_ID=${ZONE_ID}"

auth_get() { curl -sS -H "Authorization: Bearer ${TOKEN}" "$1"; }

echo "=== existing www records ==="
EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}")
echo "$EXIST" | python3 -m json.tool | head -40

# Prefer CNAME www → nebutra.com, proxied (orange) so TLS + same origin as apex.
BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'www','content':'${CONTENT}','proxied':True,'ttl':1}))")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXIST")

if [ -n "$RID" ]; then
  tmp="$(mktemp)"
  curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" -o "$tmp"
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns put", d.get("success"), d.get("errors"))' <"$tmp"
  rm -f "$tmp"
else
  tmp="$(mktemp)"
  curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" -o "$tmp"
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns post", d.get("success"), d.get("errors"))' <"$tmp"
  rm -f "$tmp"
fi

echo "=== smoke www (may need DNS TTL) ==="
curl -sSI --max-time 20 "https://${HOST}/" | head -15 || true
curl -sS -o /dev/null -w "www_refer %{http_code}\n" --max-time 20 "https://${HOST}/refer?code=smoke" || true
echo "done"

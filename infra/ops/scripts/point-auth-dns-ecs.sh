#!/usr/bin/env bash
# Point auth.nebutra.com → ECS origin + ensure Origin CA covers auth hostname.
# Usage: CLOUDFLARE_API_TOKEN=… bash infra/ops/scripts/point-auth-dns-ecs.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ECS_HOST:-106.15.4.31}"
HOST="auth.${ZONE_NAME}"

auth() { curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

echo "=== token verify ==="
auth "https://api.cloudflare.com/client/v4/user/tokens/verify" | python3 -m json.tool | head -40

ZONE_ID=$(auth "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
[ -n "$ZONE_ID" ] || { echo "zone missing"; exit 1; }
echo "ZONE_ID=$ZONE_ID ORIGIN_IP=$ORIGIN_IP HOST=$HOST"

echo "=== upsert DNS A ${HOST} → ${ORIGIN_IP} (proxied) ==="
EXIST=$(auth "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=A")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXIST")
BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'auth','content':'${ORIGIN_IP}','proxied':True,'ttl':1}))")
if [ -n "$RID" ]; then
  auth -X PUT --data "$BODY" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns put", d.get("success"), d.get("errors") or d.get("result",{}).get("name"))'
else
  auth -X POST --data "$BODY" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns post", d.get("success"), d.get("errors") or d.get("result",{}).get("name"))'
fi

echo "=== list auth DNS ==="
auth "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}" \
  | python3 -m json.tool | head -40

echo "=== note: origin cert SAN may need dashboard refresh if Full(strict) TLS ==="
echo "done"

#!/usr/bin/env bash
# Point docs.nebutra.com at the ECS/Cloud VM origin (emergency when Vercel
# Hobby quota is exhausted and Cloudflare Workers API token lacks deploy scope).
#
# Usage:
#   CLOUDFLARE_API_TOKEN=… bash infra/ops/scripts/point-docs-dns-ecs.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ECS_HOST:-${VM_HOST:-106.15.4.31}}"
HOST="docs.${ZONE_NAME}"

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

ZONE_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")
ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "zone missing: $ZONE_JSON"; exit 1; }
echo "ZONE_ID=$ZONE_ID ORIGIN_IP=$ORIGIN_IP HOST=$HOST"
export ZONE_ID CLOUDFLARE_API_TOKEN

BODY=$(python3 -c "import json; print(json.dumps({'type':'A','name':'docs','content':'${ORIGIN_IP}','proxied':True,'ttl':1,'comment':'nebutra-sailor-docs ECS emergency'}))")

# Drop conflicting CNAME (Vercel project DNS) if present
CNAME_EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=CNAME")
CNAME_RID=$(echo "$CNAME_EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
if [ -n "$CNAME_RID" ]; then
  echo "=== DELETE conflicting CNAME $CNAME_RID ==="
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${CNAME_RID}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("deleted_cname", d.get("success"))'
fi

EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=A")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

if [ -n "$RID" ]; then
  echo "=== PUT existing A $RID ==="
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  echo "=== POST new A docs ==="
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin);
ok=d.get("success"); print("dns_write_success", ok, d.get("errors"));
assert ok, d.get("errors") or d
r=d.get("result") or {}
print(r.get("type"), r.get("name"), "→", r.get("content"), "proxied=", r.get("proxied"))'

# Remove leftover Worker routes that would override origin.
python3 - <<'PY'
import json, os, urllib.request
token=os.environ["CLOUDFLARE_API_TOKEN"]
zone=os.environ["ZONE_ID"]
req=urllib.request.Request(
  f"https://api.cloudflare.com/client/v4/zones/{zone}/workers/routes",
  headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req) as resp:
  routes=json.load(resp).get("result") or []
for r in routes:
  pat=r.get("pattern") or ""
  if "docs.nebutra.com" not in pat:
    continue
  rid=r["id"]
  print("DELETE worker route", pat, rid)
  dreq=urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone}/workers/routes/{rid}",
    headers={"Authorization": f"Bearer {token}"},
    method="DELETE",
  )
  try:
    with urllib.request.urlopen(dreq) as resp:
      print(" deleted", json.load(resp).get("success"))
  except Exception as e:
    print(" delete failed", e)
PY

echo "done — docs.nebutra.com → ECS ${ORIGIN_IP} (proxied)"

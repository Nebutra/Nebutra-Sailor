#!/usr/bin/env bash
# Point forge.nebutra.com → Vercel (CNAME, DNS-only recommended for custom cert).
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="forge.${ZONE_NAME}"
# Prefer project-specific Vercel DNS target when provided; fall back to generic.
TARGET="${FORGE_DNS_TARGET:-cname.vercel-dns.com}"

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -m json.tool | head -40
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

ZONE_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")
ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "zone missing: $ZONE_JSON"; exit 1; }
echo "ZONE_ID=$ZONE_ID HOST=$HOST TARGET=$TARGET"

# Drop conflicting A/AAAA (ECS leftovers)
for TYPE in A AAAA; do
  EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=${TYPE}")
  echo "$EXIST" | python3 -c '
import json,sys,os,urllib.request
d=json.load(sys.stdin)
token=os.environ["CLOUDFLARE_API_TOKEN"]
zone=os.environ["ZONE_ID"]
for r in d.get("result") or []:
  rid=r["id"]
  print("DELETE", r.get("type"), rid, r.get("content"))
  req=urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone}/dns_records/{rid}",
    method="DELETE",
    headers={"Authorization": f"Bearer {token}"},
  )
  with urllib.request.urlopen(req) as resp:
    print(resp.read().decode()[:200])
' 2>/dev/null || true
done

BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'forge','content':'${TARGET}','proxied':False,'ttl':1,'comment':'nebutra-forge product edge (Vercel)'}))")
EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=CNAME")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

export ZONE_ID
if [ -n "$RID" ]; then
  echo "=== PUT existing CNAME $RID ==="
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  echo "=== POST new CNAME forge ==="
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -m json.tool | head -60
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin);
ok=d.get("success"); print("dns_write_success", ok);
assert ok, d.get("errors") or d'

echo "=== verify DoH ==="
sleep 3
curl -sS "https://cloudflare-dns.com/dns-query?name=${HOST}&type=CNAME" -H "accept: application/dns-json" | python3 -m json.tool | head -30
echo "done"

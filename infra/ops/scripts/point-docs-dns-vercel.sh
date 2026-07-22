#!/usr/bin/env bash
set -euo pipefail
TOKEN="${CLOUDFLARE_API_TOKEN:?}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
ACC="${CLOUDFLARE_ACCOUNT_ID:-}"
# Project-specific Vercel DNS for the `docs` project (apps/sailor-docs).
# Generic cname.vercel-dns.com can attach the hostname to the wrong project.
TARGET="${DOCS_DNS_TARGET:-331816c5997d8344.vercel-dns-017.com}"

ZONE_ID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
[ -n "$ZONE_ID" ] || { echo "zone missing"; exit 1; }
echo "ZONE_ID=$ZONE_ID"

auth_get() { curl -sS -H "Authorization: Bearer $TOKEN" "$1"; }

echo "=== token verify ==="
auth_get "https://api.cloudflare.com/client/v4/user/tokens/verify" | python3 -m json.tool | head -30

echo "=== DNS docs ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=docs.${ZONE_NAME}" | python3 -m json.tool | head -50

echo "=== Worker routes ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" | python3 -m json.tool | head -80

echo "=== Dynamic redirects ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint" | python3 -m json.tool | head -100

echo "=== Static redirects phase ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_redirect/entrypoint" | python3 -m json.tool | head -100

echo "=== All zone rulesets ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" | python3 -c '
import json,sys
d=json.load(sys.stdin)
for r in d.get("result") or []:
  print(r.get("phase"), r.get("name"), r.get("id"), "rules", r.get("rules_count") or len(r.get("rules") or []))
'

echo "=== Page rules ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules" | python3 -m json.tool | head -60

# Delete worker routes that match docs.nebutra.com
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

# Upsert DNS (best effort)
BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'docs','content':'$TARGET','proxied':True,'ttl':1}))")
EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=docs.${ZONE_NAME}")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXIST")
if [ -n "$RID" ]; then
  curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns put", d.get("success"), d.get("errors"))'
else
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns post", d.get("success"), d.get("errors"))'
fi

echo "done"

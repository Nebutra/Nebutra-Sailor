#!/usr/bin/env bash
# Upsert open.nebutra.com → cname.vercel-dns.com (proxied orange-cloud).
#
# Open is a landing host alias (apps/landing proxy rewrites / → /open).
# It must NOT point at ECS: without an open server_name the default 443
# block answers `301 → https://nebutra.com$request_uri`.
#
# After DNS:
#   vercel domains add open.nebutra.com --project nebutra-landing --scope nebutra
#   (or run .github/workflows/point-dns.yml host=open target=vercel, which attaches the domain)
#
# Body rules (match point-www / point-status / point-carina):
# - Never include a `comment` field — some tokens return CF 10000 on write.
# - Drop leftover A/AAAA (ECS cutover) before owning the name with CNAME.
#
# Required token permissions on zone nebutra.com:
#   Zone → DNS → Edit
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="open.${ZONE_NAME}"
CONTENT="${OPEN_DNS_TARGET:-cname.vercel-dns.com}"
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
echo "ZONE_ID=${ZONE_ID} HOST=${HOST} → ${CONTENT}"

# Drop A/AAAA leftovers so CNAME can own the name (ECS mispoint cutover).
for rtype in A AAAA; do
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

echo "=== existing open CNAME records ==="
EXIST=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=CNAME")
echo "$EXIST" | python3 -m json.tool | head -40

BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'open','content':'${CONTENT}','proxied':True,'ttl':1}))")
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
    errs=d.get("errors") or []
    codes=[e.get("code") for e in errs if isinstance(e, dict)]
    if 10000 in codes:
        print("::error::CLOUDFLARE_API_TOKEN cannot write DNS (code 10000).")
        print("::error::Grant Zone DNS Edit on nebutra.com and update the GitHub secret.")
        print("::error::Until then set open CNAME cname.vercel-dns.com (proxied) in CF dashboard.")
    raise SystemExit(1)
r=d.get("result") or {}
print(r.get("type"), r.get("name"), "->", r.get("content"), "proxied=", r.get("proxied"))
' "$tmp"
rm -f "$tmp"

echo "=== smoke (DNS may still be propagating; domain must be on nebutra-landing) ==="
curl -sSI --max-time 20 "https://${HOST}/" | head -20 || true
echo "done"

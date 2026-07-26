#!/usr/bin/env bash
# Point docs.nebutra.com at Vercel project `docs` (grey-cloud CNAME).
# Project-specific target — do not use generic cname.vercel-dns.com.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
TARGET="${DOCS_DNS_TARGET:-331816c5997d8344.vercel-dns-017.com}"
HOST="docs.${ZONE_NAME}"

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

ZONE_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")
ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "zone missing: $ZONE_JSON"; exit 1; }
echo "ZONE_ID=$ZONE_ID TARGET=$TARGET HOST=$HOST"
export ZONE_ID CLOUDFLARE_API_TOKEN

# Drop A/AAAA (ECS cutover leftovers) so CNAME can own the name.
for rtype in A AAAA; do
  EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=${rtype}")
  while read -r rid; do
    [ -z "$rid" ] && continue
    echo "=== DELETE ${rtype} $rid ==="
    curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print("deleted", d.get("success"))'
  done < <(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print("\n".join(x["id"] for x in r))')
done

BODY=$(python3 -c "import json; print(json.dumps({
  'type': 'CNAME',
  'name': 'docs',
  'content': '${TARGET}',
  'proxied': False,
  'ttl': 1,
  'comment': 'nebutra-sailor-docs Vercel project docs (grey-cloud)',
}))")

EXIST=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}&type=CNAME")
RID=$(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')

if [ -n "$RID" ]; then
  echo "=== PUT CNAME $RID ==="
  RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}")
else
  echo "=== POST CNAME docs ==="
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
fi
echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin);
ok=d.get("success"); print("dns_write_success", ok, d.get("errors"));
assert ok, d.get("errors") or d
r=d.get("result") or {}
print(r.get("type"), r.get("name"), "→", r.get("content"), "proxied=", r.get("proxied"))'

# Best-effort worker route cleanup (token may only have DNS scopes).
python3 - <<'PY' || true
import json, os, urllib.error, urllib.request
token=os.environ["CLOUDFLARE_API_TOKEN"]
zone=os.environ["ZONE_ID"]
try:
  req=urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone}/workers/routes",
    headers={"Authorization": f"Bearer {token}"},
  )
  with urllib.request.urlopen(req) as resp:
    routes=json.load(resp).get("result") or []
except urllib.error.HTTPError as e:
  print(f"skip worker-route cleanup (HTTP {e.code})")
  raise SystemExit(0)
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

echo "done — docs.nebutra.com → Vercel ${TARGET} (DNS only / grey-cloud)"

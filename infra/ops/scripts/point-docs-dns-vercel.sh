#!/usr/bin/env bash
# Point docs.nebutra.com at Vercel and remove CF redirect rules that bounce it to apex.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
RECORD_NAME="docs"
TARGET="${DOCS_DNS_TARGET:-cname.vercel-dns.com}"
ACC="${CLOUDFLARE_ACCOUNT_ID:-}"

ZONE_ID=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
[ -n "$ZONE_ID" ] || { echo "zone $ZONE_NAME not found" >&2; exit 1; }

# 1) DNS CNAME
EXISTING=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}.${ZONE_NAME}")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXISTING")
BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'$RECORD_NAME','content':'$TARGET','proxied':True,'ttl':1}))")
if [ -n "$RID" ]; then
  curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns", d.get("success"), d.get("errors"))'
else
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("dns", d.get("success"), d.get("errors"))'
fi

# 2) Strip Dynamic Redirect rules that target docs.nebutra.com → nebutra.com
ENTRY=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint")
python3 - <<'PY' "$TOKEN" "$ZONE_ID" "$ENTRY"
import json, sys, urllib.request
token, zone, raw = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.loads(raw)
result = data.get("result") or {}
rules = result.get("rules") or []
rid = result.get("id")
if not rid:
    print("no dynamic redirect entrypoint ruleset")
    sys.exit(0)
kept = []
removed = []
for r in rules:
    expr = (r.get("expression") or "") + json.dumps(r.get("action_parameters") or {})
    if "docs.nebutra.com" in expr and "nebutra.com" in expr:
        removed.append(r.get("description") or r.get("id") or expr[:80])
        continue
    kept.append(r)
print("redirect rules kept", len(kept), "removed", removed)
if not removed:
    sys.exit(0)
body = json.dumps({"rules": kept}).encode()
req = urllib.request.Request(
    f"https://api.cloudflare.com/client/v4/zones/{zone}/rulesets/{rid}",
    data=body,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    method="PUT",
)
with urllib.request.urlopen(req) as resp:
    out = json.load(resp)
print("ruleset update success", out.get("success"), out.get("errors"))
PY

# 3) Page Rules mentioning docs
PAGES=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules?status=active")
python3 - <<'PY' "$TOKEN" "$ZONE_ID" "$PAGES"
import json, sys, urllib.request
token, zone, raw = sys.argv[1], sys.argv[2], sys.argv[3]
for r in (json.loads(raw).get("result") or []):
    targets = json.dumps(r.get("targets") or [])
    actions = json.dumps(r.get("actions") or [])
    if "docs.nebutra.com" not in targets + actions:
        continue
    rid = r["id"]
    print("deleting page rule", rid, targets)
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/zones/{zone}/pagerules/{rid}",
        headers={"Authorization": f"Bearer {token}"},
        method="DELETE",
    )
    with urllib.request.urlopen(req) as resp:
        print(json.load(resp).get("success"))
PY

echo "done"

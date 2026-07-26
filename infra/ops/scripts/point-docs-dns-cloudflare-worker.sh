#!/usr/bin/env bash
# Point docs.nebutra.com at the OpenNext Worker (nebutra-sailor-docs).
#
# Workers routes only apply when DNS is orange-cloud (proxied). Grey-cloud CNAME
# to Vercel bypasses CF entirely — that is the old Hobby/Vercel path.
#
# Usage (CI / local with token):
#   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
#     bash infra/ops/scripts/point-docs-dns-cloudflare-worker.sh
#
# Optional:
#   DOCS_WORKER_TARGET=nebutra-sailor-docs.nebutra.workers.dev
#   CF_ZONE_NAME=nebutra.com
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
# Match typelens smoke URL pattern: <worker>.nebutra.workers.dev
TARGET="${DOCS_WORKER_TARGET:-nebutra-sailor-docs.nebutra.workers.dev}"
RECORD_NAME="docs"

auth_get() {
  curl -sS -H "Authorization: Bearer ${TOKEN}" "$1"
}

ZONE_ID=$(
  __cf_tmp="$(mktemp)"
  curl -sS -H "Authorization: Bearer ${TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" -o "$__cf_tmp"
  python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <"$__cf_tmp"
  rm -f "$__cf_tmp"
)
[ -n "$ZONE_ID" ] || {
  echo "zone missing for ${ZONE_NAME}"
  exit 1
}
echo "ZONE_ID=${ZONE_ID}"
echo "TARGET=${TARGET} (proxied CNAME for Worker route)"

# Upsert CNAME docs → workers.dev, proxied=true so routes/WAF apply.
BODY=$(python3 -c "import json; print(json.dumps({
  'type': 'CNAME',
  'name': '${RECORD_NAME}',
  'content': '${TARGET}',
  'proxied': True,
  'ttl': 1,
}))")

EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}.${ZONE_NAME}")
RID=$(python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")' <<<"$EXIST")

__cf_tmp="$(mktemp)"
if [ -n "$RID" ]; then
  curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" -o "$__cf_tmp"
else
  curl -sS -X POST -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" -o "$__cf_tmp"
fi
python3 -c '
import json,sys
d=json.load(sys.stdin)
ok=d.get("success")
print("dns upsert success=", ok, "errors=", d.get("errors"))
if not ok:
  sys.exit(1)
result=d.get("result") or {}
print("record", result.get("name"), "→", result.get("content"), "proxied=", result.get("proxied"))
' <"$__cf_tmp"
rm -f "$__cf_tmp"

echo "=== worker routes (docs) ==="
auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" | python3 -c '
import json,sys
routes=json.load(sys.stdin).get("result") or []
for r in routes:
  pat=r.get("pattern") or ""
  if "docs" in pat:
    print(pat, "→", r.get("script"), r.get("id"))
'

echo "done — allow ~30–60s for DNS/edge propagation"

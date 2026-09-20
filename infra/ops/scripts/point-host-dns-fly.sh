#!/usr/bin/env bash
# Point a nebutra.com hostname at a Fly app (proxied CNAME → <app>.fly.dev).
# Usage: HOST=forge FLY_APP=nebutra-forge ./infra/ops/scripts/point-host-dns-fly.sh
#
# Cloudflare will not hold a CNAME beside an A/AAAA at the same name, so the
# old records have to go before the new one lands. That ordering is destructive:
# a token allowed to delete but not create would strip the hostname and leave
# nothing behind, and this script used to discard the delete responses entirely,
# so it could not even tell you that had happened.
#
# The write capability is therefore proven on a throwaway record before anything
# real is touched, and every mutation is checked. A token without DNS:Edit now
# fails while production DNS is still intact.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="${HOST:?HOST is the DNS label, e.g. forge}"
FLY_APP="${FLY_APP:?FLY_APP is the Fly app name, e.g. nebutra-forge}"
TARGET="${FLY_APP}.fly.dev"
FQDN="${HOST}.${ZONE_NAME}"
API="https://api.cloudflare.com/client/v4"

cf() { curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

# Read `success`, printing Cloudflare's own errors when it is false.
ok() {
  python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    print("non-JSON response:", raw[:400], file=sys.stderr); sys.exit(1)
if not d.get("success"):
    print(json.dumps(d.get("errors") or d)[:400], file=sys.stderr); sys.exit(1)
print(json.dumps(d.get("result")))
'
}

record_id() {
  python3 -c 'import json,sys; r=json.load(sys.stdin) or []; print(r[0]["id"] if r else "")'
}

if ! ZONES=$(cf "${API}/zones?name=${ZONE_NAME}" | ok); then
  echo "::error::CLOUDFLARE_API_TOKEN was rejected by Cloudflare (see the error above). Nothing was changed."
  exit 1
fi
ZONE_ID=$(printf '%s' "$ZONES" | python3 -c 'import json,sys; r=json.load(sys.stdin) or [{}]; print(r[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "::error::No zone ${ZONE_NAME} is visible to this token."; exit 1; }

# Preflight: prove the token can create and delete before deleting anything real.
PROBE="_dns-cutover-preflight.${HOST}"
PROBE_BODY=$(python3 -c "import json; print(json.dumps({'type':'TXT','name':'${PROBE}','content':'nebutra cutover preflight','ttl':60}))")
if ! PROBE_ID=$(cf -X POST --data "$PROBE_BODY" "${API}/zones/${ZONE_ID}/dns_records" | ok |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])'); then
  echo "::error::CLOUDFLARE_API_TOKEN cannot write DNS in ${ZONE_NAME}. It needs Zone → DNS → Edit on that zone. Nothing was changed."
  exit 1
fi
if ! cf -X DELETE "${API}/zones/${ZONE_ID}/dns_records/${PROBE_ID}" | ok >/dev/null; then
  echo "::error::Created the preflight record ${PROBE}.${ZONE_NAME} but could not delete it. Remove it by hand; nothing else was changed."
  exit 1
fi
echo "preflight ok — token can edit DNS in ${ZONE_NAME}"

delete_type() {
  local type="$1" rid
  rid=$(cf "${API}/zones/${ZONE_ID}/dns_records?name=${FQDN}&type=${type}" | ok | record_id)
  [ -n "$rid" ] || return 0
  if ! cf -X DELETE "${API}/zones/${ZONE_ID}/dns_records/${rid}" | ok >/dev/null; then
    echo "::error::Failed to delete the existing ${type} record for ${FQDN}."
    exit 1
  fi
  echo "removed ${type} ${FQDN}"
}

delete_type A
delete_type AAAA

BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'${HOST}','content':'${TARGET}','proxied':True,'ttl':1,'comment':'fly ${FLY_APP}'}))")
RID=$(cf "${API}/zones/${ZONE_ID}/dns_records?name=${FQDN}&type=CNAME" | ok | record_id)

if [ -n "$RID" ]; then
  RESULT=$(cf -X PUT --data "$BODY" "${API}/zones/${ZONE_ID}/dns_records/${RID}" | ok)
else
  RESULT=$(cf -X POST --data "$BODY" "${API}/zones/${ZONE_ID}/dns_records" | ok)
fi
printf '%s' "$RESULT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("cname", d["name"], "->", d["content"])'

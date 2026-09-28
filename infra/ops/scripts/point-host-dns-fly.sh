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

# Behind Cloudflare's proxy, Fly cannot see its own addresses on the hostname,
# so it cannot issue the certificate by looking at A/AAAA/CNAME: it needs the
# DNS-01 challenge delegated to it and an ownership record. Fly states both;
# read them rather than guessing, and write them unproxied. Without these the
# edge answers 525 (it cannot complete TLS to the origin) — acme.nebutra.com
# shipped that way on 2026-09-28.
upsert() {
  local type="$1" name="$2" content="$3" rid body
  body=$(python3 -c "import json,sys; print(json.dumps({'type':sys.argv[1],'name':sys.argv[2],'content':sys.argv[3],'proxied':False,'ttl':300,'comment':'fly ${FLY_APP} certificate'}))" "$type" "$name" "$content")
  rid=$(cf "${API}/zones/${ZONE_ID}/dns_records?name=${name}&type=${type}" | ok | record_id)
  if [ -n "$rid" ]; then
    cf -X PUT --data "$body" "${API}/zones/${ZONE_ID}/dns_records/${rid}" | ok >/dev/null
  else
    cf -X POST --data "$body" "${API}/zones/${ZONE_ID}/dns_records" | ok >/dev/null
  fi
  echo "${type} ${name} -> ${content}"
}

if ! command -v flyctl >/dev/null 2>&1 || [ -z "${FLY_API_TOKEN:-}" ]; then
  echo "::warning::flyctl or FLY_API_TOKEN missing: the certificate records for ${FQDN} were not written. Run 'flyctl certs setup ${FQDN} -a ${FLY_APP}' and add them."
  exit 0
fi
if ! CERT=$(flyctl certs show "${FQDN}" -a "${FLY_APP}" --json 2>/dev/null); then
  echo "::warning::${FLY_APP} has no certificate for ${FQDN} yet (flyctl certs add first); certificate records not written."
  exit 0
fi
read -r CHALLENGE_NAME CHALLENGE_TARGET OWNER_NAME OWNER_VALUE < <(printf '%s' "$CERT" | python3 -c '
import json, sys
r = json.load(sys.stdin).get("dns_requirements") or {}
c, o = r.get("acme_challenge") or {}, r.get("ownership") or {}
print(c.get("name", "-"), (c.get("target") or "-").rstrip("."), o.get("name", "-"), o.get("app_value", "-"))
')
[ "$CHALLENGE_NAME" != "-" ] && upsert CNAME "$CHALLENGE_NAME" "$CHALLENGE_TARGET"
[ "$OWNER_NAME" != "-" ] && upsert TXT "$OWNER_NAME" "$OWNER_VALUE"
flyctl certs check "${FQDN}" -a "${FLY_APP}" >/dev/null 2>&1 || true
echo "certificate records written; Fly re-checks ${FQDN} now"

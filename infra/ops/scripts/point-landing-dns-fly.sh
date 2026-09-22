#!/usr/bin/env bash
# Point nebutra.com (apex) plus its landing host aliases at the landing Fly app.
#
# The generic point-host-dns-fly.sh only knows <label>.nebutra.com, but the
# marketing site owns four names: the apex itself, www (canonicalised to the
# apex by the app), status and open (host aliases that rewrite to a section).
# All four must sit on the same Machine, because they are one Next.js app.
#
# Usage: FLY_APP=nebutra-landing ./infra/ops/scripts/point-landing-dns-fly.sh
#
# Cloudflare accepts a proxied CNAME at the zone apex (CNAME flattening), so
# the apex needs no dedicated IPv4. `fly certs add nebutra.com` (and each
# alias) must have been run first, or Cloudflare answers 525.
#
# Deleting the old A/AAAA is destructive and has to happen before the CNAME
# can own the name. The token's write capability is therefore proven on a
# throwaway record before anything real is touched, and every mutation is
# checked.
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
FLY_APP="${FLY_APP:?FLY_APP is the Fly app name, e.g. nebutra-landing}"
TARGET="${FLY_APP}.fly.dev"
API="https://api.cloudflare.com/client/v4"

# Fly validates custom-domain certificates through records Cloudflare must hold
# (see `fly certs setup <host> -a <app>`):
#   CNAME _acme-challenge.<host> → <host>.<dns-suffix>.flydns.net   (DNS only)
#   TXT   _fly-ownership.<host>  → <ownership-id>                    (DNS only)
# The ownership record is required because traffic is proxied. Without both,
# Fly leaves the certificate "Not verified" and Cloudflare answers 525 as soon
# as the proxied CNAME lands. The two values come from `fly certs setup` and
# change only if the app is recreated.
FLY_DNS_SUFFIX="${FLY_DNS_SUFFIX:-nwd610d}"
FLY_OWNERSHIP_ID="${FLY_OWNERSHIP_ID:-app-nwd610d}"

# Apex first, then the aliases. The apex entry is the FQDN; the rest are labels.
NAMES=("${ZONE_NAME}" "www" "status" "open")

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

# Upsert one record by (name, type) and print it.
upsert() {
  local type="$1" name="$2" content="$3" proxied="$4" body rid
  body=$(python3 -c '
import json, sys
print(json.dumps({
    "type": sys.argv[1],
    "name": sys.argv[2],
    "content": sys.argv[3],
    "proxied": sys.argv[4] == "true",
    "ttl": 1,
}))
' "$type" "$name" "$content" "$proxied")
  rid=$(cf "${API}/zones/${ZONE_ID}/dns_records?name=${name}&type=${type}" | ok | record_id)
  if [ -n "$rid" ]; then
    cf -X PUT --data "$body" "${API}/zones/${ZONE_ID}/dns_records/${rid}" | ok
  else
    cf -X POST --data "$body" "${API}/zones/${ZONE_ID}/dns_records" | ok
  fi
}

if ! ZONES=$(cf "${API}/zones?name=${ZONE_NAME}" | ok); then
  echo "::error::CLOUDFLARE_API_TOKEN was rejected by Cloudflare (see the error above). Nothing was changed."
  exit 1
fi
ZONE_ID=$(printf '%s' "$ZONES" | python3 -c 'import json,sys; r=json.load(sys.stdin) or [{}]; print(r[0].get("id",""))')
[ -n "$ZONE_ID" ] || { echo "::error::No zone ${ZONE_NAME} is visible to this token."; exit 1; }

# Preflight: prove the token can create and delete before deleting anything real.
PROBE="_dns-cutover-preflight.landing"
PROBE_BODY=$(python3 -c "import json; print(json.dumps({'type':'TXT','name':'${PROBE}','content':'nebutra landing cutover preflight','ttl':60}))")
if ! PROBE_ID=$(cf -X POST --data "$PROBE_BODY" "${API}/zones/${ZONE_ID}/dns_records" | ok |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])'); then
  echo "::error::CLOUDFLARE_API_TOKEN cannot write DNS in ${ZONE_NAME}. It needs Zone → DNS → Edit on that zone. Nothing was changed."
  exit 1
fi
if ! cf -X DELETE "${API}/zones/${ZONE_ID}/dns_records/${PROBE_ID}" | ok >/dev/null; then
  echo "::error::Created the preflight record ${PROBE} but could not delete it. Remove it by hand; nothing else was changed."
  exit 1
fi
echo "preflight ok — token can edit DNS in ${ZONE_NAME}"

for name in "${NAMES[@]}"; do
  if [ "$name" = "$ZONE_NAME" ]; then
    fqdn="$ZONE_NAME"
    rec_name="$ZONE_NAME"
  else
    fqdn="${name}.${ZONE_NAME}"
    rec_name="$name"
  fi
  echo "=== ${fqdn} → ${TARGET} ==="

  # A/AAAA leftovers (the Vercel apex answered A 76.76.21.21) win over a
  # CNAME, so they have to go first.
  for rtype in A AAAA; do
    rid=$(cf "${API}/zones/${ZONE_ID}/dns_records?name=${fqdn}&type=${rtype}" | ok | record_id)
    [ -n "$rid" ] || continue
    if ! cf -X DELETE "${API}/zones/${ZONE_ID}/dns_records/${rid}" | ok >/dev/null; then
      echo "::error::Failed to delete the existing ${rtype} record for ${fqdn}."
      exit 1
    fi
    echo "removed ${rtype} ${fqdn}"
  done

  BODY=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'${rec_name}','content':'${TARGET}','proxied':True,'ttl':1,'comment':'fly ${FLY_APP}'}))")
  RID=$(cf "${API}/zones/${ZONE_ID}/dns_records?name=${fqdn}&type=CNAME" | ok | record_id)
  if [ -n "$RID" ]; then
    RESULT=$(cf -X PUT --data "$BODY" "${API}/zones/${ZONE_ID}/dns_records/${RID}" | ok)
  else
    RESULT=$(cf -X POST --data "$BODY" "${API}/zones/${ZONE_ID}/dns_records" | ok)
  fi
  printf '%s' "$RESULT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("cname", d["name"], "->", d["content"], "proxied=", d["proxied"])'

  # Fly certificate validation. DNS-only on purpose: an orange-cloud CNAME at
  # _acme-challenge never reaches the CA, and the ownership TXT is how Fly
  # proves the app owns a hostname behind a proxy.
  upsert CNAME "_acme-challenge.${fqdn}" "${fqdn}.${FLY_DNS_SUFFIX}.flydns.net" false |
    python3 -c 'import json,sys; d=json.load(sys.stdin); print("acme", d["name"], "->", d["content"])'
  upsert TXT "_fly-ownership.${fqdn}" "${FLY_OWNERSHIP_ID}" false |
    python3 -c 'import json,sys; d=json.load(sys.stdin); print("ownership", d["name"], "->", d["content"])'
done

echo "=== smoke (DNS may still be propagating) ==="
for url in "https://${ZONE_NAME}/api/e2e/health" "https://www.${ZONE_NAME}/" "https://status.${ZONE_NAME}/" "https://open.${ZONE_NAME}/"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -L "$url" || echo 000)
  echo "GET $url -> $code"
done
echo "done"

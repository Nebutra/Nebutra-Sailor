#!/usr/bin/env bash
# Point auth.nebutra.com at the OpenNext Worker (nebutra-auth).
#
# Workers routes only apply when DNS is orange-cloud (proxied). Do NOT use
# cname.vercel-dns.com — production auth target is Cloudflare Workers (Google
# OAuth egress + Hyperdrive → PlanetScale), not Vercel.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
#     bash infra/ops/scripts/point-auth-dns-cloudflare-worker.sh
#
# Optional:
#   AUTH_WORKER_TARGET=nebutra-auth.nebutra.workers.dev
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
TARGET="${AUTH_WORKER_TARGET:-nebutra-auth.nebutra.workers.dev}"
RECORD_NAME="auth"

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

# Drop A/AAAA leftovers so CNAME can own the name.
for rtype in A AAAA; do
  EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}.${ZONE_NAME}&type=${rtype}")
  while read -r rid; do
    [ -z "$rid" ] && continue
    echo "=== DELETE ${rtype} $rid ==="
    curl -sS -X DELETE -H "Authorization: Bearer ${TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print("deleted", d.get("success"), d.get("errors"))'
  done < <(echo "$EXIST" | python3 -c 'import json,sys; r=json.load(sys.stdin).get("result") or []; print("\n".join(x["id"] for x in r))')
done

BODY=$(python3 -c "import json; print(json.dumps({
  'type': 'CNAME',
  'name': '${RECORD_NAME}',
  'content': '${TARGET}',
  'proxied': True,
  'ttl': 1,
}))")

EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${RECORD_NAME}.${ZONE_NAME}&type=CNAME")
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
  errs=d.get("errors") or []
  codes=[e.get("code") for e in errs if isinstance(e, dict)]
  if 10000 in codes:
    print("::error::CLOUDFLARE_API_TOKEN cannot write DNS (code 10000).")
    print("::error::In CF dashboard: CNAME auth → nebutra-auth.nebutra.workers.dev (proxied).")
  sys.exit(1)
result=d.get("result") or {}
print("record", result.get("name"), "→", result.get("content"), "proxied=", result.get("proxied"))
' <"$__cf_tmp"
rm -f "$__cf_tmp"

echo "=== smoke ==="
for i in 1 2 3 4 5 6; do
  code=$(curl -sS -o /tmp/ah.json -w '%{http_code}' --max-time 25 "https://auth.${ZONE_NAME}/health" || echo 000)
  echo "try $i -> $code"
  if [ "$code" = "200" ]; then
    head -c 400 /tmp/ah.json; echo
    curl -sSI --max-time 15 "https://auth.${ZONE_NAME}/health" | head -15 || true
    exit 0
  fi
  sleep 10
done
echo "DNS written; origin not ready yet"
exit 0

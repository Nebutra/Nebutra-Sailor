#!/usr/bin/env bash
# Point auth.nebutra.com at the product auth edge Worker.
#
# Product surface is ONLY https://auth.nebutra.com — never publish
# *.<account>.workers.dev URLs externally (those are CI/debug hostnames).
#
# Preferred path: wrangler custom_domain on deploy (wrangler.edge.jsonc) creates
# the zone record. This script is the manual / recovery path when deploy cannot
# write DNS (token missing Zone DNS Edit).
#
# Usage:
#   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
#     bash infra/ops/scripts/point-auth-dns-cloudflare-worker.sh
#
# Optional:
#   AUTH_WORKER_TARGET=…   # override CNAME target (default: product-neutral CF)
#   CF_WORKERS_DEV_HOST=nebutra-auth.<subdomain>.workers.dev  # internal only
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
RECORD_NAME="auth"

# Prefer an explicit internal workers.dev host from env (CI can set after
# `wrangler deploy` prints the URL). Fall back to resolving via CF API so we
# never hardcode a personal account slug like "omichiliriku" in product docs.
TARGET="${AUTH_WORKER_TARGET:-}"
if [ -z "$TARGET" ] && [ -n "${CF_WORKERS_DEV_HOST:-}" ]; then
  TARGET="${CF_WORKERS_DEV_HOST}"
fi

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

# Discover account workers.dev subdomain from the API (product-neutral).
if [ -z "$TARGET" ]; then
  ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
  if [ -n "$ACCOUNT_ID" ]; then
    SUB=$(
      auth_get "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/subdomain" \
        | python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result") or {}; print(r.get("subdomain") or "")' 2>/dev/null || true
    )
    if [ -n "$SUB" ]; then
      TARGET="nebutra-auth.${SUB}.workers.dev"
      echo "discovered workers.dev host: ${TARGET} (internal; not a product URL)"
    fi
  fi
fi

if [ -z "$TARGET" ]; then
  echo "::error::Set AUTH_WORKER_TARGET or CF_WORKERS_DEV_HOST, or CLOUDFLARE_ACCOUNT_ID for subdomain discovery."
  echo "::error::Product DNS should ultimately be the Worker custom domain auth.nebutra.com (see wrangler.edge.jsonc)."
  exit 1
fi

echo "TARGET=${TARGET} (proxied CNAME; public brand host remains auth.${ZONE_NAME})"

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
  'comment': 'Nebutra auth edge — public host auth.${ZONE_NAME}; CNAME target is CF internal only',
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
    print("::error::Product path: Dashboard → Workers → nebutra-auth → Custom domains → auth.nebutra.com")
    print("::error::Or DNS: CNAME auth → (internal workers.dev host) proxied; public URL stays https://auth.nebutra.com")
  sys.exit(1)
result=d.get("result") or {}
print("record", result.get("name"), "→", result.get("content"), "proxied=", result.get("proxied"))
print("public product URL: https://auth.%s" % ("'"${ZONE_NAME}"'",))
' <"$__cf_tmp"
rm -f "$__cf_tmp"

echo "=== smoke product host ==="
for i in 1 2 3 4 5 6; do
  code=$(curl -sS -o /tmp/ah.json -w '%{http_code}' --max-time 25 "https://auth.${ZONE_NAME}/health" || echo 000)
  echo "try $i https://auth.${ZONE_NAME}/health -> $code"
  if [ "$code" = "200" ]; then
    head -c 400 /tmp/ah.json; echo
    curl -sSI --max-time 15 "https://auth.${ZONE_NAME}/health" | head -15 || true
    exit 0
  fi
  sleep 10
done
echo "DNS written; origin not ready yet"
exit 0

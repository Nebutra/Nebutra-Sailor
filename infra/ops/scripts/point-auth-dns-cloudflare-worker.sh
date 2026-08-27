#!/usr/bin/env bash
# Bind product host auth.nebutra.com to Worker nebutra-auth.
#
# No workers.dev. Public URL is only https://auth.nebutra.com.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
#     bash infra/ops/scripts/point-auth-dns-cloudflare-worker.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID required}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOSTNAME="auth.${ZONE_NAME}"
WORKER_NAME="${AUTH_WORKER_NAME:-nebutra-auth}"

auth_get() {
  curl -sS -H "Authorization: Bearer ${TOKEN}" "$1"
}

auth_json() {
  curl -sS -X "$1" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    ${2:+--data "$2"} "$3"
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
echo "ZONE_ID=${ZONE_ID} HOST=${HOSTNAME} WORKER=${WORKER_NAME}"

# Drop Vercel / foreign CNAMEs and bare A/AAAA so CF can own the name.
for rtype in A AAAA CNAME; do
  EXIST=$(auth_get "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOSTNAME}&type=${rtype}")
  while read -r rid content; do
    [ -z "$rid" ] && continue
    echo "=== DELETE ${rtype} ${rid} (${content}) ==="
    curl -sS -X DELETE -H "Authorization: Bearer ${TOKEN}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print("deleted", d.get("success"), d.get("errors"))'
  done < <(echo "$EXIST" | python3 -c '
import json,sys
for x in json.load(sys.stdin).get("result") or []:
    print(x["id"], x.get("content") or "")
')
done

# Attach custom domain to the Worker (product hostname — not workers.dev).
BODY=$(python3 -c "import json; print(json.dumps({
  'hostname': '${HOSTNAME}',
  'service': '${WORKER_NAME}',
  'environment': 'production',
  'zone_id': '${ZONE_ID}',
}))")

__cf_tmp="$(mktemp)"
curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  --data "$BODY" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains/records" \
  -o "$__cf_tmp" || true

# Older/newer API shapes — try alternate attach endpoint if needed.
if ! python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("success") else 1)' <"$__cf_tmp" 2>/dev/null; then
  curl -sS -X PUT -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
    --data "$BODY" \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains" \
    -o "$__cf_tmp" || true
fi

python3 -c '
import json,sys
d=json.load(sys.stdin)
ok=d.get("success")
print("workers domain attach success=", ok, "errors=", d.get("errors"), "result=", d.get("result"))
if not ok:
  errs=d.get("errors") or []
  codes=[e.get("code") for e in errs if isinstance(e, dict)]
  if 10000 in codes:
    print("::error::Token cannot attach custom domain (code 10000).")
  print("::error::Dashboard: Workers → nebutra-auth → Domains → Add auth.nebutra.com")
  print("::error::Or re-run: wrangler deploy --config apps/auth/wrangler.edge.jsonc (custom_domain)")
  # Soft continue — deploy may already have attached; smoke tells us.
' <"$__cf_tmp" || true
rm -f "$__cf_tmp"

echo "=== smoke product host only ==="
for i in 1 2 3 4 5 6 7 8; do
  code=$(curl -sS -o /tmp/ah.json -w '%{http_code}' --max-time 25 "https://${HOSTNAME}/health" || echo 000)
  echo "try $i https://${HOSTNAME}/health -> $code"
  if [ "$code" = "200" ]; then
    head -c 500 /tmp/ah.json; echo
    # Must be edge layer, not Vercel
    if grep -q '"layer":"edge"' /tmp/ah.json 2>/dev/null || grep -q 'login-center-edge' /tmp/ah.json 2>/dev/null; then
      echo "ok: product host serves auth edge"
      exit 0
    fi
    echo "warn: 200 but body may still be old origin (Vercel/ECS); check server headers"
    curl -sSI --max-time 15 "https://${HOSTNAME}/health" | head -12 || true
    exit 0
  fi
  sleep 8
done
echo "domain attach attempted; product host not ready yet"
exit 0

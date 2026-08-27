#!/usr/bin/env bash
# Delegate leak.nebutra.com to the ECS authoritative DNS leak service.
#
#   CLOUDFLARE_API_TOKEN=… ORIGIN_IP=106.15.4.31 \
#     bash infra/ops/scripts/point-leak-zone-dns.sh
#
# CRITICAL: glue A for ns1.leak must be DNS-only (proxied=false).
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
ZONE_NAME="${ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ORIGIN_IP:-${ECS_HOST:-106.15.4.31}}"

if [[ -z "${TOKEN}" ]]; then
  echo "CLOUDFLARE_API_TOKEN required" >&2
  exit 1
fi

echo "=== token verify ==="
VERIFY=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/user/tokens/verify" || true)
echo "$VERIFY" | python3 -m json.tool | head -40
echo "$VERIFY" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success"), d; print("token_ok", d.get("result",{}).get("status"))'

ZONE_JSON=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")
ZONE_ID=$(echo "$ZONE_JSON" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id",""))')
[[ -n "$ZONE_ID" ]] || { echo "zone missing: $ZONE_JSON"; exit 1; }
echo "ZONE_ID=$ZONE_ID ORIGIN_IP=$ORIGIN_IP"

auth_json() {
  # $1 method $2 url $3 optional body
  local method="$1" url="$2" body="${3:-}"
  local tmp
  tmp="$(mktemp)"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$body" \
      -o "$tmp" -w "%{http_code}" \
      "$url"
  else
    curl -sS -X "$method" \
      -H "Authorization: Bearer ${TOKEN}" \
      -o "$tmp" -w "%{http_code}" \
      "$url"
  fi
  echo
  cat "$tmp"
  echo
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1]));
print("success", d.get("success"));
print("errors", d.get("errors"));
sys.exit(0 if d.get("success") else 1)' "$tmp"
  local code=$?
  rm -f "$tmp"
  return $code
}

find_rid() {
  local rtype="$1" fqdn="$2"
  local resp
  resp=$(curl -sS -H "Authorization: Bearer ${TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=${rtype}&name=${fqdn}")
  echo "$resp" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or [{}])[0].get("id","") if r.get("success") else "")'
}

upsert_a() {
  local name="$1" content="$2"
  local fqdn="${name}.${ZONE_NAME}"
  local body rid
  body=$(python3 -c "import json; print(json.dumps({
    'type':'A','name':'${name}','content':'${content}',
    'proxied':False,'ttl':1,'comment':'forge dns-leak authority glue (DNS-only)'
  }))")
  rid=$(find_rid A "$fqdn")
  if [[ -n "$rid" ]]; then
    echo "=== PUT A ${fqdn} rid=${rid} → ${content} (proxied=false) ==="
    auth_json PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" "$body"
  else
    echo "=== POST A ${fqdn} → ${content} (proxied=false) ==="
    auth_json POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" "$body"
  fi
}

upsert_ns() {
  local name="$1" content="$2"
  local fqdn="${name}.${ZONE_NAME}"
  local body rid
  # NS records: proxied is not used
  body=$(python3 -c "import json; print(json.dumps({
    'type':'NS','name':'${name}','content':'${content}',
    'ttl':1,'comment':'forge dns-leak zone delegation'
  }))")
  rid=$(find_rid NS "$fqdn")
  if [[ -n "$rid" ]]; then
    echo "=== PUT NS ${fqdn} rid=${rid} → ${content} ==="
    auth_json PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" "$body"
  else
    echo "=== POST NS ${fqdn} → ${content} ==="
    auth_json POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" "$body"
  fi
}

upsert_a "ns1.leak" "${ORIGIN_IP}"
upsert_ns "leak" "ns1.leak.${ZONE_NAME}"

echo "=== dig checks ==="
dig NS "leak.${ZONE_NAME}" +short || true
dig A "ns1.leak.${ZONE_NAME}" +short || true
dig @"${ORIGIN_IP}" SOA "leak.${ZONE_NAME}" +norecurse +time=3 || true
echo "Done. Ensure SG allows UDP/TCP 53 → ${ORIGIN_IP} and PM2 forge-dns-leak is up."

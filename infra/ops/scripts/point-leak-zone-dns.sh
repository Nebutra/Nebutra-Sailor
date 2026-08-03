#!/usr/bin/env bash
# Delegate leak.nebutra.com to the ECS authoritative DNS leak service.
#
# Cloudflare API (global key or token with Zone.DNS Edit):
#   CLOUDFLARE_API_TOKEN=…  ZONE_NAME=nebutra.com  ORIGIN_IP=106.15.4.31
#   bash infra/ops/scripts/point-leak-zone-dns.sh
#
# CRITICAL: NS glue A records must be DNS-only (proxied=false). Orange-cloud
# on ns1.leak breaks authoritative answers and hides recursive source IPs.
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-nebutra.com}"
ORIGIN_IP="${ORIGIN_IP:-106.15.4.31}"
NS_HOST="ns1.leak"
ZONE_HOST="leak"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "CLOUDFLARE_API_TOKEN required" >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")
zone_id=$(curl -fsS "${auth[@]}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result'][0]['id'])")

echo "zone_id=${zone_id} origin=${ORIGIN_IP}"

upsert() {
  local type="$1" name="$2" content="$3" proxied="$4"
  local list body rid
  list=$(curl -fsS "${auth[@]}" \
    "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?type=${type}&name=${name}.${ZONE_NAME}")
  rid=$(python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result'][0]['id'] if r.get('result') else '')" <<<"$list")
  body=$(python3 -c "import json; print(json.dumps({'type':'${type}','name':'${name}','content':'${content}','proxied':${proxied},'ttl':1,'comment':'forge dns-leak authority'}))")
  if [[ -n "$rid" ]]; then
    echo "PATCH ${type} ${name} → ${content} proxied=${proxied}"
    curl -fsS -X PUT "${auth[@]}" \
      "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${rid}" \
      --data "$body" >/dev/null
  else
    echo "POST ${type} ${name} → ${content} proxied=${proxied}"
    curl -fsS -X POST "${auth[@]}" \
      "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
      --data "$body" >/dev/null
  fi
}

# Glue A for the nameserver (must be grey-cloud)
upsert A "${NS_HOST}" "${ORIGIN_IP}" false
# Subdomain delegation
upsert NS "${ZONE_HOST}" "ns1.leak.${ZONE_NAME}" false

echo "=== dig checks (from this host) ==="
dig "NS" "leak.${ZONE_NAME}" +short || true
dig "@${ORIGIN_IP}" "SOA" "leak.${ZONE_NAME}" +norecurse +time=2 || true
echo "Done. Open UDP/TCP 53 on the security group toward the public internet."

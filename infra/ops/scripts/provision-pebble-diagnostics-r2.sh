#!/usr/bin/env bash
# Provision Cloudflare R2 bucket for Pebble diagnostic bundles.
#
# Prerequisites:
#   CLOUDFLARE_API_TOKEN   — Account API token with R2 Admin (or Workers R2 Write)
#   CLOUDFLARE_ACCOUNT_ID  — default a4248a5738df319996a70092fe598d37
#
# Creates bucket nebutra-pebble-diagnostics (private). S3 API tokens for the
# gateway must still be created in the CF dashboard (Object Read & Write).
#
# Usage:
#   CLOUDFLARE_API_TOKEN=… bash infra/ops/scripts/provision-pebble-diagnostics-r2.sh
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-${CLOUDFLARE_WORKERS_API_TOKEN:-}}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-a4248a5738df319996a70092fe598d37}"
BUCKET="${PEBBLE_DIAGNOSTICS_BUCKET:-nebutra-pebble-diagnostics}"

if [ -z "$TOKEN" ]; then
  echo "Set CLOUDFLARE_API_TOKEN (R2 Admin / write)" >&2
  exit 1
fi

auth() {
  curl -sS -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" "$@"
}

echo "=== list existing R2 buckets ==="
LIST=$(auth "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets")
echo "$LIST" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if not d.get("success"):
  print("list_failed", d.get("errors")); sys.exit(2)
names=[b.get("name") for b in (d.get("result") or {}).get("buckets") or d.get("result") or []]
# API shape: result.buckets | result as list
if isinstance(d.get("result"), list):
  names=[b.get("name") for b in d["result"]]
elif isinstance(d.get("result"), dict):
  names=[b.get("name") for b in (d["result"].get("buckets") or [])]
print("buckets:", ", ".join(n for n in names if n) or "(none)")
open("/tmp/r2-buckets.txt","w").write("\n".join(n for n in names if n))
'

if grep -qx "$BUCKET" /tmp/r2-buckets.txt 2>/dev/null; then
  echo "bucket already exists: $BUCKET"
else
  echo "=== create bucket $BUCKET ==="
  CREATE=$(auth -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets" \
    --data "{\"name\":\"${BUCKET}\"}")
  echo "$CREATE" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("create", d.get("success"), d.get("errors") or d.get("result"))
raise SystemExit(0 if d.get("success") else 3)
'
fi

echo ""
echo "=== next: S3 API token (dashboard, one-time) ==="
echo "1. https://dash.cloudflare.com/${ACCOUNT_ID}/r2/api-tokens"
echo "2. Create API token → Object Read & Write → include bucket ${BUCKET}"
echo "3. Copy Access Key ID + Secret Access Key"
echo "4. Apply on ECS api-gateway env:"
echo ""
cat <<EOF
# /var/www/nebutra/api/.env  (or gh workflow ops-configure-pebble-r2)
UPLOAD_PROVIDER=s3
R2_ACCOUNT_ID=${ACCOUNT_ID}
R2_ACCESS_KEY_ID=<from dashboard>
R2_SECRET_ACCESS_KEY=<from dashboard>
R2_ENDPOINT=https://${ACCOUNT_ID}.r2.cloudflarestorage.com
PEBBLE_DIAGNOSTICS_BUCKET=${BUCKET}
# optional override for local fallback path
# PEBBLE_DIAGNOSTICS_DIR=/var/www/nebutra/data/pebble-diagnostics
EOF
echo ""
echo "Or: gh workflow run ops-configure-pebble-r2.yml  (after setting GH secrets R2_*)"
echo "Docs: docs/ops/pebble-support-intake.md"

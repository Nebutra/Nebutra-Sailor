#!/usr/bin/env bash
# Register the gateway's Inngest app with the self-hosted server and prove it took.
#
#   bash infra/ops/scripts/verify-inngest-sync.sh https://nebutra-gateway.fly.dev
#
# 1. PUT <base>/api/inngest   the SDK POSTs its function list to INNGEST_BASE_URL
#                             (/fn/register); the answer is the server's own verdict.
# 2. GET <base>/api/inngest   introspection: must show keys set and function_count > 0.
# Fails (exit 1) on any non-200 sync, missing keys, or zero functions. This is the
# guard for the 2026-10-02 incident: signing key unset, GET /api/inngest -> 500,
# no function ever ran. Prints no secret; the endpoint exposes only booleans.
set -euo pipefail

base="${1:-${GATEWAY_URL:-}}"
if [ -z "$base" ]; then
  echo "usage: verify-inngest-sync.sh <gateway base url>" >&2
  exit 2
fi
url="${base%/}/api/inngest"
tries="${INNGEST_SYNC_TRIES:-6}"

fail() { echo "::error::$*" >&2; exit 1; }

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

ok=0
for i in $(seq 1 "$tries"); do
  code="$(curl -sS -o "$tmp" -w '%{http_code}' --max-time 30 -X PUT "$url" || echo 000)"
  status="$(python3 -c 'import json,sys
try: print(json.load(open(sys.argv[1])).get("status",""))
except Exception: print("")' "$tmp")"
  echo "PUT $url try $i -> http $code, server status ${status:-?}"
  if [ "$code" = "200" ] && [ "$status" = "200" ]; then ok=1; break; fi
  sleep 10
done
[ "$ok" = "1" ] || fail "Inngest sync failed against $url (last http $code, status ${status:-?}). Check INNGEST_SIGNING_KEY / INNGEST_BASE_URL on the gateway and the nebutra-inngest Machine."

code="$(curl -sS -o "$tmp" -w '%{http_code}' --max-time 30 "$url" || echo 000)"
[ "$code" = "200" ] || fail "GET $url -> $code (introspection must answer 200)"
python3 - "$tmp" <<'PY' || exit 1
import json, sys
d = json.load(open(sys.argv[1]))
n = d.get("function_count", 0)
print(f"mode={d.get('mode')} has_event_key={d.get('has_event_key')} has_signing_key={d.get('has_signing_key')} function_count={n}")
bad = []
if not d.get("has_signing_key"): bad.append("INNGEST_SIGNING_KEY is not set")
if not d.get("has_event_key"): bad.append("INNGEST_EVENT_KEY is not set")
if not isinstance(n, int) or n < 1: bad.append("function_count is 0")
if bad:
    print("::error::Inngest guard: " + "; ".join(bad))
    sys.exit(1)
PY
echo "Inngest app synced."

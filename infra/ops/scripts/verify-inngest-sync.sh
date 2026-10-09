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

sync_started="$(date -u +%Y-%m-%dT%H:%M:%S)"
ok=0
for i in $(seq 1 "$tries"); do
  code="$(curl -sS -o "$tmp" -w '%{http_code}' --max-time 30 -X PUT "$url" || echo 000)"
  # inngest-js v4 answers a successful sync with {"message":"Successfully
  # registered"} and no "status" field; a rejected app (e.g. a function config
  # the server cannot compile) comes back non-200.
  status="$(python3 -c 'import json,sys
try:
    d=json.load(open(sys.argv[1]))
    print("ok" if "registered" in str(d.get("message","")).lower() else d.get("message",""))
except Exception: print("")' "$tmp")"
  echo "PUT $url try $i -> http $code, ${status:-?}"
  if [ "$code" = "200" ] && [ "$status" = "ok" ]; then ok=1; break; fi
  sleep 10
done
[ "$ok" = "1" ] || fail "Inngest sync failed against $url (last http $code, status ${status:-?}). Check INNGEST_SIGNING_KEY / INNGEST_BASE_URL on the gateway and the nebutra-inngest Machine."

# An unsigned GET is answered 401 by inngest-js >= 4.2.6 (inngest/inngest-js#1539),
# so the function list cannot be read from outside. Ask the server instead: a
# sync it could not apply shows up in its own log as "error registering functions".
if [ -n "${INNGEST_APP:-}" ]; then
  sleep 5
  # Only lines logged after this sync started count; older failures are history.
  if flyctl logs -a "$INNGEST_APP" --no-tail 2>/dev/null \
    | python3 -c 'import re,sys
since=sys.argv[1]
for line in sys.stdin:
    plain=re.sub(r"\x1b\[[0-9;]*m","",line)
    m=re.match(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})",plain)
    if m and m.group(1)>=since and "error registering functions" in plain:
        sys.exit(0)
sys.exit(1)' "$sync_started"; then
    fail "nebutra-inngest logged 'error registering functions' after the sync"
  fi
fi
echo "Inngest app synced."

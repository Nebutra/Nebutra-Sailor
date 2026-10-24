#!/usr/bin/env bash
# Smoke-test a running Nebutra Status instance end to end: health, pages, the
# native and compat JSON, first-run setup, an API key, an evidence push, and
# the deploy gate turning from 412 to 200.
#
#   BASE=http://localhost:3140 SETUP_TOKEN=… SLUG=acme COMPONENT=sign-in apps/status/scripts/smoke.sh
#
# Needs curl and jq. Exits non-zero on the first failed check.
set -euo pipefail

BASE="${BASE:-http://localhost:3140}"
SLUG="${SLUG:-acme}"
COMPONENT="${COMPONENT:-sign-in}"
SETUP_TOKEN="${SETUP_TOKEN:?SETUP_TOKEN is required}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

pass() { printf '  ok  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }

# expect <status> <label> <curl args…> — prints the body for the caller.
expect() {
  local want="$1" label="$2"
  shift 2
  local out code
  out="$(curl -sS -w '\n%{http_code}' "$@")" || fail "$label (curl error)"
  code="${out##*$'\n'}"
  body="${out%$'\n'*}"
  [ "$code" = "$want" ] || { printf '%s\n' "$body" >&2; fail "$label: HTTP $code, wanted $want"; }
  pass "$label ($code)"
}

echo "waiting for $BASE/api/healthz"
for _ in $(seq 1 90); do
  curl -fsS "$BASE/api/healthz" >/dev/null 2>&1 && break
  sleep 2
done

expect 200 "GET /api/healthz" "$BASE/api/healthz"
jq -e '.ok == true and .database.ok == true' <<<"$body" >/dev/null || fail "healthz body"
expect 200 "GET /api/readyz" "$BASE/api/readyz"
expect 200 "GET /" "$BASE/"
expect 200 "GET /p/$SLUG" "$BASE/p/$SLUG"
expect 200 "GET status JSON" "$BASE/api/v1/pages/$SLUG/status"
jq -e --arg c "$COMPONENT" '.version == 1 and ([.components[].key] | index($c)) != null' <<<"$body" >/dev/null \
  || fail "status JSON lists $COMPONENT"
expect 200 "GET xiaoya-v1 compat" "$BASE/compat/xiaoya-v1/$SLUG/status.json"
jq -e '.page.name and (.overall | test("^(operational|degraded|outage)$"))' <<<"$body" >/dev/null \
  || fail "compat shape"
expect 200 "GET feed.atom" "$BASE/api/v1/pages/$SLUG/feed.atom"

expect 201 "POST setup (first owner)" -c "$JAR" -X POST "$BASE/api/v1/auth/setup" \
  -H 'content-type: application/json' \
  -d "{\"setupToken\":\"$SETUP_TOKEN\",\"email\":\"smoke@example.com\",\"password\":\"smoke-test-password\",\"workspaceSlug\":\"$SLUG\"}"
expect 201 "POST keys (mint evidence key)" -b "$JAR" -X POST "$BASE/api/v1/keys" \
  -H 'content-type: application/json' -H "origin: $BASE" \
  -d '{"name":"smoke","scopes":["evidence:write","status:read"]}'
KEY="$(jq -r .key <<<"$body")"
[[ "$KEY" == ns_* ]] || fail "minted key"

SINCE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
sleep 1
expect 412 "GET gate before evidence" "$BASE/api/v1/pages/$SLUG/gate?components=$COMPONENT&since=$SINCE"
expect 202 "POST evidence (synthetic)" -X POST "$BASE/api/v1/pages/$SLUG/evidence" \
  -H "authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d "{\"component\":\"$COMPONENT\",\"source\":\"smoke\",\"coverage\":\"synthetic\",\"state\":\"operational\",\"latencyMs\":42,\"freshnessSeconds\":300}"
expect 200 "GET gate after evidence" "$BASE/api/v1/pages/$SLUG/gate?components=$COMPONENT&since=$SINCE"
jq -e '.pass == true' <<<"$body" >/dev/null || fail "gate pass"

echo "smoke passed"

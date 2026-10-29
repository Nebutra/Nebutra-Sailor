#!/usr/bin/env bash
# R2 cost guardrails, applied from the repo instead of clicked together in the dashboard.
#
#   apply-r2-guardrails.sh lifecycle   # lifecycle rules for every infra/iac/cloudflare/r2/lifecycle/<bucket>.json
#   apply-r2-guardrails.sh cdn-cache   # the cdn.nebutra.com Cache Rule (query strings ignored, errors not cached)
#   apply-r2-guardrails.sh print-lifecycle | print-cdn-rule   # no token needed; what would be applied
#
# lifecycle: PUT replaces a bucket's whole rule set, so each file is the complete desired set.
#   Needs CLOUDFLARE_API_TOKEN with R2 Admin Write and CLOUDFLARE_ACCOUNT_ID.
# cdn-cache: one rule, found by its `ref` and patched only when its content hash changed, so the
#   phase ruleset is never replaced (the landing/KCQ rules live in the same phase). A change purges
#   the cdn host once, because the old cache key included the query string.
#   Needs CLOUDFLARE_API_TOKEN with Zone -> Cache Rules Edit + Cache Purge on CF_ZONE_NAME.
#
# Unlike the deploy-time edge-cache scripts this one fails loudly: it only runs from an ops
# workflow, where a silent skip would look like a guardrail that is on when it is not.
set -euo pipefail

MODE="${1:?usage: apply-r2-guardrails.sh lifecycle|cdn-cache|print-lifecycle|print-cdn-rule}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
LIFECYCLE_DIR="${R2_LIFECYCLE_DIR:-$ROOT/infra/iac/cloudflare/r2/lifecycle}"
CACHE_RULES="${CDN_CACHE_RULES:-$ROOT/infra/iac/cloudflare/rules/cache-rules.json}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
API="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"
PHASE="http_request_cache_settings"
RULE_REF="r2_cdn_assets"
RULE_NAME="Cache CDN assets"

die() { echo "::error title=R2 guardrails::$*"; exit 1; }

# The cdn rule as the Rulesets API wants it. The description carries a hash of what matters, so
# "already applied" is a string compare rather than a diff of Cloudflare's normalised echo.
desired_cdn_rule() {
  CACHE_RULES="$CACHE_RULES" RULE_REF="$RULE_REF" RULE_NAME="$RULE_NAME" python3 -c '
import hashlib, json, os, sys
rules = json.load(open(os.environ["CACHE_RULES"]))["rules"]
src = next((r for r in rules if r["name"] == os.environ["RULE_NAME"]), None)
if src is None:
    sys.exit("no rule named " + repr(os.environ["RULE_NAME"]) + " in " + os.environ["CACHE_RULES"])
core = {"expression": src["expression"], "action": src["action"], "action_parameters": src["action_parameters"]}
digest = hashlib.sha256(json.dumps(core, sort_keys=True).encode()).hexdigest()[:12]
text = src["description"]
print(json.dumps({
    "ref": os.environ["RULE_REF"],
    "description": text + " [sha:" + digest + "]",
    **core,
    "enabled": True,
}))
'
}

if [ "$MODE" = "print-cdn-rule" ]; then
  desired_cdn_rule
  exit $?
fi

if [ "$MODE" = "print-lifecycle" ]; then
  for f in "$LIFECYCLE_DIR"/*.json; do
    echo "$(basename "$f" .json): $(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))' "$f")"
  done
  exit 0
fi

[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "CLOUDFLARE_API_TOKEN is not set."

# cf METHOD PATH [BODY] -> the raw response; the token is never echoed.
cf() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS --max-time 30 -X "$method" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" --data "$body" "${API}${path}"
  else
    curl -sS --max-time 30 -X "$method" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "${API}${path}"
  fi
}

# Reads a Cloudflare envelope on stdin: prints .result as JSON, or "ERR <codes> <messages>" and fails.
result() {
  python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    print("ERR non-JSON " + raw[:200]); sys.exit(1)
if not d.get("success"):
    errs = d.get("errors") or []
    print("ERR " + ",".join(str(e.get("code")) for e in errs) + " " + "; ".join(str(e.get("message")) for e in errs)[:300]); sys.exit(1)
print(json.dumps(d.get("result")))
'
}

lifecycle() {
  local account="${CLOUDFLARE_ACCOUNT_ID:-}" f bucket body out
  [ -n "$account" ] || die "CLOUDFLARE_ACCOUNT_ID is not set."
  for f in "$LIFECYCLE_DIR"/*.json; do
    bucket="$(basename "$f" .json)"
    body="$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))' "$f")"
    out=$(cf PUT "/accounts/${account}/r2/buckets/${bucket}/lifecycle" "$body" | result) ||
      die "Lifecycle for ${bucket} refused (${out}). The token needs R2 Admin Write."
    echo "Lifecycle applied to ${bucket}: $(python3 -c 'import json,sys; print(", ".join(r["id"] for r in json.load(open(sys.argv[1]))["rules"]))' "$f")"
  done
}

cdn_cache() {
  local desired zones zone_id current plan out status
  desired=$(desired_cdn_rule) || die "Cannot build the cdn rule from ${CACHE_RULES}."
  zones=$(cf GET "/zones?name=${ZONE_NAME}" | result) || die "Zone lookup for ${ZONE_NAME} refused (${zones})."
  zone_id=$(printf '%s' "$zones" | python3 -c 'import json,sys; r=json.load(sys.stdin) or [{}]; print(r[0].get("id",""))')
  [ -n "$zone_id" ] || die "Zone ${ZONE_NAME} is not visible to the token (needs Zone -> Zone -> Read)."

  if ! current=$(cf GET "/zones/${zone_id}/rulesets/phases/${PHASE}/entrypoint" | result); then
    case "$current" in
      # No cache-rules entrypoint yet: create it holding just this rule.
      *10003*|*"could not find"*|*"not found"*)
        out=$(cf PUT "/zones/${zone_id}/rulesets/phases/${PHASE}/entrypoint" \
          "$(DESIRED="$desired" python3 -c 'import json,os; print(json.dumps({"rules":[json.loads(os.environ["DESIRED"])]}))')" | result) ||
          die "Creating the Cache Rules entrypoint refused (${out}). The token needs Zone -> Cache Rules -> Edit."
        echo "Cache Rules entrypoint created with ${RULE_REF}."
        purge_cdn "$zone_id"
        return 0 ;;
      *) die "Cannot read Cache Rules for ${ZONE_NAME} (${current}). The token needs Zone -> Cache Rules -> Edit." ;;
    esac
  fi

  # One line: "<METHOD> <path> <body>", or "OK" when the rule already carries the desired hash.
  plan=$(CURRENT="$current" DESIRED="$desired" ZONE_ID="$zone_id" python3 -c '
import json, os
current = json.loads(os.environ["CURRENT"])
want = json.loads(os.environ["DESIRED"])
zone, ruleset = os.environ["ZONE_ID"], current["id"]
base = "/zones/" + zone + "/rulesets/" + ruleset + "/rules"
have = next((r for r in current.get("rules") or [] if r.get("ref") == want["ref"]), None)
if have is None:
    print("POST", base, json.dumps(want))
elif have.get("description") != want["description"] or not have.get("enabled", True):
    print("PATCH", base + "/" + have["id"], json.dumps(want))
else:
    print("OK")
')
  if [ "$plan" = "OK" ]; then
    echo "Cache rule ${RULE_REF} already up to date."
    return 0
  fi
  IFS=' ' read -r op path body <<< "$plan"
  out=$(cf "$op" "$path" "$body" | result) ||
    die "Cache rule update refused (${out}). The token needs Zone -> Cache Rules -> Edit."
  echo "Cache rule ${RULE_REF} applied (${op})."
  purge_cdn "$zone_id"
}

# The old cache key included the query string, so what sits in cache under a bare path may be stale.
purge_cdn() {
  local zone_id="$1" out
  out=$(cf POST "/zones/${zone_id}/purge_cache" '{"hosts":["cdn.nebutra.com"]}' | result) ||
    die "Purging cdn.nebutra.com refused (${out}). The token needs Zone -> Cache Purge."
  echo "Purged cdn.nebutra.com."
}

case "$MODE" in
  lifecycle) lifecycle ;;
  cdn-cache) cdn_cache ;;
  *) die "unknown mode ${MODE}" ;;
esac

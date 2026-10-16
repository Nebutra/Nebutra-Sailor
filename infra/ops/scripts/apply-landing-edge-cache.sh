#!/usr/bin/env bash
# Cloudflare edge caching for apps/landing: nebutra.com (+ www) and the template, acme.nebutra.com.
#
#   EDGE_GROUP=nebutra apply-landing-edge-cache.sh rules   # idempotent Cache Rules for the group's hosts
#   EDGE_GROUP=nebutra apply-landing-edge-cache.sh tiered  # Smart Tiered Cache on (free) if off
#   EDGE_GROUP=nebutra apply-landing-edge-cache.sh purge   # purge the hosts so a deploy shows at once
#
# The sibling of apply-kcq-edge-cache.sh, generalised to a host group from
# infra/iac/cloudflare/edge-cache/landing.json. Cloudflare never caches HTML by default, so the
# group's hosts are made eligible and the edge follows the origin's Cloudflare-CDN-Cache-Control:
# apps/landing/src/lib/edge-cache.ts sends a ten-minute edge lifetime on prerendered public pages
# and `no-store` on everything else. A second rule bypasses what must never be cached whatever the
# origin says (API, docs, image optimisation, the preset stylesheet, RSC/prefetch requests).
#
# Rules are added or patched one by one (POST/PATCH on the rule), never by replacing the phase
# ruleset, because the landing and acme deploys run on the same push and would otherwise race
# each other (and the KCQ rules) out of the zone. Every mode is fail-soft: a token without the
# permission gets a ::warning naming it, never a failed deploy — the origin headers stay correct.
#
# Env: CLOUDFLARE_API_TOKEN (required), EDGE_GROUP (nebutra | acme), CF_ZONE_NAME (nebutra.com),
#      EDGE_CACHE_CONFIG (default: infra/iac/cloudflare/edge-cache/landing.json),
#      EDGE_PAGES (default: apps/landing/src/lib/edge-cached-pages.json; purge fallback list).
set -uo pipefail

MODE="${1:?usage: apply-landing-edge-cache.sh rules|tiered|purge}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
GROUP="${EDGE_GROUP:?set EDGE_GROUP (nebutra | acme)}"
CONFIG="${EDGE_CACHE_CONFIG:-$ROOT/infra/iac/cloudflare/edge-cache/landing.json}"
PAGES="${EDGE_PAGES:-$ROOT/apps/landing/src/lib/edge-cached-pages.json}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
API="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"
PHASE="http_request_cache_settings"

warn() { echo "::warning title=Landing edge cache (${GROUP})::$*"; exit 0; }

# The rules this group owns, as JSON: [public, bypass]. Pure function of the config; also used by
# the tests (`apply-landing-edge-cache.sh print-rules` needs no token).
desired_rules() {
  GROUP="$GROUP" CONFIG="$CONFIG" python3 -c '
import json, os, sys
cfg = json.load(open(os.environ["CONFIG"]))
group = os.environ["GROUP"]
if group not in cfg["groups"]:
    sys.exit("unknown EDGE_GROUP " + repr(group) + "; known: " + ", ".join(sorted(cfg["groups"])))
hosts = cfg["groups"][group]["hosts"]
b = cfg["bypass"]
q = lambda s: json.dumps(s)
host = "http.host in {" + " ".join(q(h) for h in hosts) + "}"
never = [f"starts_with(http.request.uri.path, {q(p)})" for p in b["pathPrefixes"]]
never.append("http.request.uri.path in {" + " ".join(q(p) for p in b["paths"]) + "}")
never += [f"any(lower(http.request.headers.names[*])[*] == {q(h)})" for h in b["requestHeaders"]]
public = {
    "ref": f"landing_edge_cache_public_{group}",
    "description": f"Landing ({group}): cache eligible, follow origin Cloudflare-CDN-Cache-Control",
    "expression": f"({host})",
    "action": "set_cache_settings",
    "action_parameters": {
        "cache": True,
        "edge_ttl": {"mode": "respect_origin"},
        "browser_ttl": {"mode": "respect_origin"},
        "serve_stale": {"disable_stale_while_updating": False},
    },
    "enabled": True,
}
bypass = {
    "ref": f"landing_edge_cache_bypass_{group}",
    "description": f"Landing ({group}): API, docs, images, preset stylesheet, RSC/prefetch never cached",
    "expression": f"({host} and (" + " or ".join(never) + "))",
    "action": "set_cache_settings",
    "action_parameters": {"cache": False},
    "enabled": True,
}
# Cache settings rules all run and the later one wins on overlap: bypass must follow public.
print(json.dumps([public, bypass]))
'
}

if [ "$MODE" = "print-rules" ]; then
  desired_rules
  exit $?
fi

[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || warn "CLOUDFLARE_API_TOKEN is not set; edge cache step '${MODE}' skipped."

# cf METHOD PATH [BODY] -> prints the JSON body; never prints the token.
cf() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS --max-time 30 -X "$method" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" --data "$body" "${API}${path}"
  else
    curl -sS --max-time 30 -X "$method" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "${API}${path}"
  fi
}

# Reads a Cloudflare envelope on stdin: prints .result as JSON on success, otherwise prints
# "ERR <codes> <messages>" and returns 1.
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

DESIRED=$(desired_rules) || warn "Cannot build the rules for group ${GROUP} from ${CONFIG}."
HOSTS=$(GROUP="$GROUP" CONFIG="$CONFIG" python3 -c 'import json,os; print(" ".join(json.load(open(os.environ["CONFIG"]))["groups"][os.environ["GROUP"]]["hosts"]))')

if ! ZONES=$(cf GET "/zones?name=${ZONE_NAME}" | result); then
  warn "Cloudflare rejected the zone lookup for ${ZONE_NAME} (${ZONES}). The token needs Zone → Zone → Read on ${ZONE_NAME}."
fi
ZONE_ID=$(printf '%s' "$ZONES" | python3 -c 'import json,sys; r=json.load(sys.stdin) or [{}]; print(r[0].get("id",""))')
[ -n "$ZONE_ID" ] || warn "Zone ${ZONE_NAME} is not visible to CLOUDFLARE_API_TOKEN (needs Zone → Zone → Read)."

apply_rules() {
  local current plan op path body out changed=0
  if ! current=$(cf GET "/zones/${ZONE_ID}/rulesets/phases/${PHASE}/entrypoint" | result); then
    case "$current" in
      # 10003/not found: the zone has no cache-rules entrypoint yet; create it with ours.
      *10003*|*"could not find"*|*"not found"*)
        body=$(DESIRED="$DESIRED" python3 -c 'import json,os; print(json.dumps({"rules": json.loads(os.environ["DESIRED"])}))')
        out=$(cf PUT "/zones/${ZONE_ID}/rulesets/phases/${PHASE}/entrypoint" "$body" | result) ||
          warn "Cloudflare refused to create the Cache Rules entrypoint (${out}). Add Zone → Cache Rules → Edit to CLOUDFLARE_API_TOKEN."
        echo "Cache Rules created for ${HOSTS}."
        return 0 ;;
      *) warn "Cannot read Cache Rules for ${ZONE_NAME} (${current}). Add Zone → Cache Rules → Edit to CLOUDFLARE_API_TOKEN." ;;
    esac
  fi
  # One line per needed call: "<METHOD> <path> <body>"; nothing when every rule already matches.
  plan=$(CURRENT="$current" DESIRED="$DESIRED" ZONE_ID="$ZONE_ID" python3 -c '
import json, os
current = json.loads(os.environ["CURRENT"])
rid, zone = current["id"], os.environ["ZONE_ID"]
existing = {r.get("ref"): r for r in current.get("rules") or [] if r.get("ref")}
public, bypass = json.loads(os.environ["DESIRED"])
keys = ("description", "expression", "action", "action_parameters", "enabled")
base = f"/zones/{zone}/rulesets/{rid}/rules"
for rule in (public, bypass):
    have = existing.get(rule["ref"])
    if have is None:
        body = dict(rule)
        if rule is public and bypass["ref"] in existing:
            body["position"] = {"before": existing[bypass["ref"]]["id"]}
        print("POST", base, json.dumps(body))
    elif any(have.get(k) != rule.get(k) for k in keys):
        rule_id = have["id"]
        print("PATCH", f"{base}/{rule_id}", json.dumps(rule))
')
  while IFS=' ' read -r op path body; do
    [ -n "$op" ] || continue
    out=$(cf "$op" "$path" "$body" | result) ||
      warn "Cloudflare refused the Cache Rule update (${out}). Add Zone → Cache Rules → Edit to CLOUDFLARE_API_TOKEN; the origin headers still apply."
    changed=1
  done <<< "$plan"
  if [ "$changed" = 0 ]; then
    echo "Cache Rules for ${HOSTS} already up to date."
  else
    echo "Cache Rules applied for ${HOSTS} (hosts eligible, origin decides; API/docs/images/RSC bypassed)."
  fi
}

tiered() {
  local tc smart out
  if ! tc=$(cf GET "/zones/${ZONE_ID}/argo/tiered_caching" | result); then
    warn "Cannot read Tiered Cache (${tc}). Needs Zone → Zone Settings → Read/Edit; skipped."
  fi
  smart=$(cf GET "/zones/${ZONE_ID}/cache/tiered_cache_smart_topology_enable" | result) || smart='{"value":"unknown"}'
  tc=$(printf '%s' "$tc" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value"))')
  smart=$(printf '%s' "$smart" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("value"))')
  echo "Tiered Cache: ${tc}; Smart Tiered Cache topology: ${smart}"
  # Smart Tiered Cache is included on every plan (no Argo charge); turn it on only when off.
  if [ "$tc" != "on" ]; then
    out=$(cf PATCH "/zones/${ZONE_ID}/argo/tiered_caching" '{"value":"on"}' | result) ||
      warn "Could not enable Tiered Cache (${out}). Needs Zone → Zone Settings → Edit."
    echo "Tiered Cache enabled."
  fi
  if [ "$smart" != "on" ]; then
    out=$(cf PATCH "/zones/${ZONE_ID}/cache/tiered_cache_smart_topology_enable" '{"value":"on"}' | result) ||
      warn "Could not enable Smart Tiered Cache (${out}). Needs Zone → Zone Settings → Edit."
    echo "Smart Tiered Cache topology enabled."
  fi
}

purge() {
  local body out urls batch
  # Purge by hostname (every plan since 2025): the HTML, and the hashed assets, which only refetch.
  body=$(HOSTS="$HOSTS" python3 -c 'import json,os; print(json.dumps({"hosts": os.environ["HOSTS"].split()}))')
  if out=$(cf POST "/zones/${ZONE_ID}/purge_cache" "$body" | result); then
    echo "Purged hosts: ${HOSTS}."
    return 0
  fi
  echo "Purge by hostname refused (${out}); purging the public page URLs instead."
  urls=$(HOSTS="$HOSTS" CONFIG="$CONFIG" PAGES="$PAGES" python3 -c '
import json, os
cfg = json.load(open(os.environ["CONFIG"]))
pages = json.load(open(os.environ["PAGES"]))
for host in os.environ["HOSTS"].split():
    if host.startswith("www."):
        continue  # www only redirects onto the apex
    for locale in cfg["purgeFallbackLocales"]:
        for page in pages:
            path = (f"/{locale}" if locale else "") + (page if page != "/" or not locale else "")
            print(f"https://{host}{path or chr(47)}")
')
  # Purge-by-URL takes at most 30 URLs per request on every plan.
  while IFS= read -r batch; do
    [ -n "$batch" ] || continue
    if ! out=$(cf POST "/zones/${ZONE_ID}/purge_cache" "$batch" | result); then
      warn "Cloudflare refused the cache purge (${out}). Add Zone → Cache Purge → Purge to CLOUDFLARE_API_TOKEN; pages refresh within 10 minutes without it."
    fi
  done < <(printf '%s\n' "$urls" | python3 -c '
import json, sys
u = [l.strip() for l in sys.stdin if l.strip()]
for i in range(0, len(u), 30):
    print(json.dumps({"files": u[i:i + 30]}))
')
  echo "Purged $(printf '%s\n' "$urls" | grep -c .) URLs on ${HOSTS}; other locales refresh within 10 minutes."
}

case "$MODE" in
  rules) apply_rules ;;
  tiered) tiered ;;
  purge) purge ;;
  *) echo "usage: apply-landing-edge-cache.sh rules|tiered|purge|print-rules" >&2; exit 2 ;;
esac

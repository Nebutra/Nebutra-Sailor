#!/usr/bin/env bash
# Cloudflare edge caching for kcq.nebutra.com's prerendered public pages.
#
#   apply-kcq-edge-cache.sh rules   # idempotent Cache Rules (phase http_request_cache_settings)
#   apply-kcq-edge-cache.sh tiered  # read Tiered Cache; turn on Smart Tiered Cache (free) if off
#   apply-kcq-edge-cache.sh purge   # purge the public URLs so a deploy shows immediately
#
# Cloudflare never caches HTML by default, so the public paths are made eligible and the edge
# follows the origin's Cloudflare-CDN-Cache-Control (nginx map $kcq_edge_cache in
# infra/fly/kcq.nginx.conf). The app shell, connector proxies, API and streams are bypassed
# explicitly. Every mode is fail-soft: a token without the permission gets a ::warning naming it,
# never a failed deploy, because the origin stays correct without the edge.
#
# Env: CLOUDFLARE_API_TOKEN (required), CF_ZONE_NAME (nebutra.com), KCQ_HOST (kcq.nebutra.com),
#      HTML_ROOT (purge: the staged dist; its *.html/.txt/.xml decide the URL list).
set -uo pipefail

MODE="${1:?usage: apply-kcq-edge-cache.sh rules|tiered|purge}"
ZONE_NAME="${CF_ZONE_NAME:-nebutra.com}"
HOST="${KCQ_HOST:-kcq.nebutra.com}"
API="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"
PHASE="http_request_cache_settings"

warn() { echo "::warning title=KCQ edge cache::$*"; exit 0; }

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

if ! ZONES=$(cf GET "/zones?name=${ZONE_NAME}" | result); then
  warn "Cloudflare rejected the zone lookup for ${ZONE_NAME} (${ZONES}). The token needs Zone → Zone → Read on ${ZONE_NAME}."
fi
ZONE_ID=$(printf '%s' "$ZONES" | python3 -c 'import json,sys; r=json.load(sys.stdin) or [{}]; print(r[0].get("id",""))')
[ -n "$ZONE_ID" ] || warn "Zone ${ZONE_NAME} is not visible to CLOUDFLARE_API_TOKEN (needs Zone → Zone → Read)."

# Public prerendered paths; keep in step with apps/kcq/src/public/routes.ts and the nginx map.
PUBLIC_PATHS='"/home" "/zh/home" "/benchmark" "/zh/benchmark" "/investors" "/zh/investors" "/llms.txt" "/llms-full.txt" "/robots.txt" "/sitemap.xml"'

apply_rules() {
  local current desired body
  if ! current=$(cf GET "/zones/${ZONE_ID}/rulesets/phases/${PHASE}/entrypoint" | result); then
    case "$current" in
      # 10003/not found: the zone has no cache-rules entrypoint yet; the PUT below creates it.
      *10003*|*"could not find"*|*"not found"*) current='{"rules":[]}' ;;
      *) warn "Cannot read Cache Rules for ${ZONE_NAME} (${current}). Add Zone → Cache Rules → Edit to CLOUDFLARE_API_TOKEN." ;;
    esac
  fi
  desired=$(HOST="$HOST" PUBLIC_PATHS="$PUBLIC_PATHS" CURRENT="$current" python3 -c '
import json, os
host, paths = os.environ["HOST"], os.environ["PUBLIC_PATHS"]
public = {
    "ref": "kcq_edge_cache_public",
    "description": "KCQ public pages: cache at the edge, follow origin Cloudflare-CDN-Cache-Control",
    "expression": (f"(http.host eq \"{host}\" and (http.request.uri.path in {{{paths}}}"
                   " or http.request.uri.path eq \"/docs\" or starts_with(http.request.uri.path, \"/docs/\")"
                   " or http.request.uri.path eq \"/zh/docs\" or starts_with(http.request.uri.path, \"/zh/docs/\")))"),
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
    "ref": "kcq_edge_cache_bypass",
    "description": "KCQ app, account, API, connector proxies and streams: never cached",
    "expression": (f"(http.host eq \"{host}\" and (http.request.uri.path eq \"/\""
                   " or http.request.uri.path eq \"/app\" or starts_with(http.request.uri.path, \"/app/\")"
                   " or starts_with(http.request.uri.path, \"/settings/\")"
                   " or starts_with(http.request.uri.path, \"/api/\")"
                   " or starts_with(http.request.uri.path, \"/market/\")))"),
    "action": "set_cache_settings",
    "action_parameters": {"cache": False},
    "enabled": True,
}
ours = [public, bypass]
keys = ("ref", "description", "expression", "action", "action_parameters", "enabled")
existing = json.loads(os.environ["CURRENT"]).get("rules") or []
mine = {r.get("ref"): r for r in existing if r.get("ref") in {o["ref"] for o in ours}}
if all(o["ref"] in mine and all(mine[o["ref"]].get(k) == o.get(k) for k in keys) for o in ours):
    print("UNCHANGED"); raise SystemExit
keep = [{k: r[k] for k in ("id",) + keys if k in r} for r in existing if r.get("ref") not in mine]
for o in ours:
    if o["ref"] in mine:
        o = {"id": mine[o["ref"]]["id"], **o}
    keep.append(o)
# Cache settings rules all run and the later one wins on overlap; bypass is last on purpose.
print(json.dumps({"rules": keep}))
')
  if [ "$desired" = "UNCHANGED" ]; then
    echo "Cache Rules for ${HOST} already up to date."
    return 0
  fi
  if ! body=$(cf PUT "/zones/${ZONE_ID}/rulesets/phases/${PHASE}/entrypoint" "$desired" | result); then
    warn "Cloudflare refused the Cache Rules update (${body}). Add Zone → Cache Rules → Edit to CLOUDFLARE_API_TOKEN; the origin headers still apply."
  fi
  echo "Cache Rules applied for ${HOST} (public pages eligible, app/api/market bypassed)."
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
  local urls batch out
  urls=$(HOST="$HOST" HTML_ROOT="${HTML_ROOT:-}" python3 -c '
import os, pathlib
host, root = os.environ["HOST"], os.environ["HTML_ROOT"]
paths = {f"/{p}" for p in ("home", "benchmark", "investors")} | {f"/zh/{p}" for p in ("home", "benchmark", "investors")}
paths |= {"/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml"}
if root and pathlib.Path(root).is_dir():
    base = pathlib.Path(root)
    for f in base.rglob("*"):
        rel = "/" + f.relative_to(base).as_posix()
        if f.suffix == ".html" and f.stem not in ("index", "404"):
            paths.add(rel[:-5])  # nginx serves /home.html as /home
        elif f.name in ("llms.txt", "llms-full.txt", "sitemap.xml", "robots.txt"):
            paths.add(rel)
for p in sorted(paths):
    print(f"https://{host}{p}")
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
  echo "Purged $(printf '%s\n' "$urls" | grep -c .) URLs on ${HOST}."
}

case "$MODE" in
  rules) apply_rules ;;
  tiered) tiered ;;
  purge) purge ;;
  *) echo "usage: apply-kcq-edge-cache.sh rules|tiered|purge" >&2; exit 2 ;;
esac

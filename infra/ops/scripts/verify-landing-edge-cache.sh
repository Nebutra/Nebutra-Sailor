#!/usr/bin/env bash
# Verify Cloudflare edge caching on apps/landing after a deploy (no credentials needed).
#
#   bash infra/ops/scripts/verify-landing-edge-cache.sh https://nebutra.com
#   bash infra/ops/scripts/verify-landing-edge-cache.sh https://acme.nebutra.com acme
#   bash infra/ops/scripts/verify-landing-edge-cache.sh http://127.0.0.1:8787   # the local edge
#                                                    # (scripts/perf/edge-cache-proxy.mjs)
#
# Each public page is fetched twice: the second answer must come from the edge (cf-cache-status
# HIT, or STALE/REVALIDATED/UPDATING while a refresh is in flight), the browser header must be
# exactly `public, max-age=0, must-revalidate`, and no Set-Cookie may appear. Pages rendered per
# request, the API, image optimisation and RSC/prefetch requests must never be cached
# (DYNAMIC/BYPASS/MISS-without-store, or no cf-cache-status at all).
#
# Lighthouse (mobile, headless, the machine's own Chrome):
#   node scripts/lighthouse/landing-lighthouse.mjs --runs 3 https://nebutra.com/ https://nebutra.com/investors
set -uo pipefail

ORIGIN="${1:-https://nebutra.com}"
SITE="${2:-nebutra}"
if [ "$SITE" = "acme" ]; then
  # The template serves its own subset (site-map.ts `template: true`).
  PUBLIC=(/ /zh-Hans /blog /faq /privacy /terms /cookies)
  PRIVATE=(/pricing /status /preset-preview.css /api/e2e/health)
else
  PUBLIC=(/ /zh-Hans /investors /zh-Hans/investors /sailor /consulting /about /blog /de/investors)
  PRIVATE=(/pricing /zh-Hans/pricing /licensing /status /api/e2e/health)
fi
failures=0

headers() {
  curl -sS -o /dev/null -D - --max-time 20 -H "Accept-Encoding: gzip, br" "$@" | tr -d '\r'
}
field() { printf '%s\n' "$1" | awk -v k="$2" 'tolower($0) ~ "^"tolower(k)":" {sub(/^[^:]*:[ \t]*/, ""); print; exit}'; }
fail() { echo "FAIL $*"; failures=$((failures + 1)); }
uncached() {
  case "$1" in
    "" | DYNAMIC | BYPASS | MISS | EXPIRED) return 0 ;;
    *) return 1 ;;
  esac
}

for path in "${PUBLIC[@]}"; do
  headers "${ORIGIN}${path}" >/dev/null
  h=$(headers "${ORIGIN}${path}")
  status=$(printf '%s\n' "$h" | awk 'NR==1{print $2}')
  cache=$(field "$h" cf-cache-status | tr '[:lower:]' '[:upper:]')
  browser=$(field "$h" cache-control)
  before=$failures
  if [ "$status" != "200" ]; then fail "$path HTTP $status"; continue; fi
  case "$cache" in
    HIT | STALE | REVALIDATED | UPDATING) ;;
    *) fail "$path cf-cache-status=${cache:-none} on the second request (want HIT)" ;;
  esac
  # HTML must revalidate in the browser or it can outlive the chunks a deploy removed.
  [ "$browser" = "public, max-age=0, must-revalidate" ] || fail "$path cache-control='$browser'"
  [ -z "$(field "$h" set-cookie)" ] || fail "$path sets a cookie on a cached page"
  [ "$failures" -gt "$before" ] || echo "ok   $path cf-cache-status=$cache age=$(field "$h" age)"
done

for path in "${PRIVATE[@]}"; do
  headers "${ORIGIN}${path}" >/dev/null
  h=$(headers "${ORIGIN}${path}")
  cache=$(field "$h" cf-cache-status | tr '[:lower:]' '[:upper:]')
  if uncached "$cache"; then echo "ok   $path cf-cache-status=${cache:-none}"; else fail "$path is cached at the edge (cf-cache-status=$cache)"; fi
done

# A client-side navigation asks the same URL for the RSC payload; Cloudflare ignores `Vary: rsc`,
# so it must never be served from (or stored in) the HTML's cache entry.
for path in "${PUBLIC[1]}" "${PUBLIC[2]}"; do
  headers -H "RSC: 1" "${ORIGIN}${path}" >/dev/null
  h=$(headers -H "RSC: 1" "${ORIGIN}${path}")
  cache=$(field "$h" cf-cache-status | tr '[:lower:]' '[:upper:]')
  type=$(field "$h" content-type)
  if ! uncached "$cache"; then
    fail "$path RSC request cached at the edge (cf-cache-status=$cache)"
  elif [ "${type#text/html}" != "$type" ]; then
    fail "$path RSC request answered with HTML ($type)"
  else
    echo "ok   $path (RSC) cf-cache-status=${cache:-none}"
  fi
done

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "edge cache verified on ${ORIGIN}"

#!/usr/bin/env bash
# Verify Cloudflare edge caching on kcq.nebutra.com after a deploy (no credentials needed).
#
#   bash infra/ops/scripts/verify-kcq-edge-cache.sh [https://kcq.nebutra.com]
#
# Each public page is fetched twice: the second answer must come from the edge
# (cf-cache-status HIT, or STALE/REVALIDATED/UPDATING while a refresh is in flight), the browser
# header must stay `public, max-age=0, must-revalidate`, and no Set-Cookie may appear. The app,
# connector proxies and API must never be cached (DYNAMIC/BYPASS, or no cf-cache-status).
#
# Lighthouse (headless, run from a few regions or with throttling):
#   npx lighthouse https://kcq.nebutra.com/home --only-categories=performance \
#     --chrome-flags="--headless=new" --output=json --output-path=./lh-home.json --quiet
# Expect LCP to stop swinging with origin TTFB once the HTML is a HIT (compare
# audits["server-response-time"] before and after).
set -uo pipefail

ORIGIN="${1:-https://kcq.nebutra.com}"
PUBLIC=(/home /zh/home /benchmark /zh/benchmark /investors /zh/investors /llms.txt /robots.txt /sitemap.xml)
PRIVATE=(/app /app/settings /settings/profile /market/byok/connections /api/health)
failures=0

headers() {
  curl -sS -o /dev/null -D - --max-time 20 -H "Accept-Encoding: gzip, br" "${ORIGIN}$1" | tr -d '\r'
}
field() { printf '%s\n' "$1" | awk -v k="$2" 'tolower($0) ~ "^"tolower(k)":" {sub(/^[^:]*:[ \t]*/, ""); print; exit}'; }
fail() { echo "FAIL $*"; failures=$((failures + 1)); }

for path in "${PUBLIC[@]}"; do
  headers "$path" >/dev/null
  h=$(headers "$path")
  status=$(printf '%s\n' "$h" | awk 'NR==1{print $2}')
  cache=$(field "$h" cf-cache-status | tr '[:lower:]' '[:upper:]')
  browser=$(field "$h" cache-control)
  before=$failures
  if [ "$status" != "200" ]; then fail "$path HTTP $status"; continue; fi
  case "$cache" in
    HIT | STALE | REVALIDATED | UPDATING) ;;
    *) fail "$path cf-cache-status=${cache:-none} on the second request (want HIT)" ;;
  esac
  if [ "$browser" != "public, max-age=0, must-revalidate" ]; then
    # HTML must revalidate in the browser or it can outlive the chunks a deploy removed;
    # robots.txt may be rewritten by Cloudflare's managed robots feature, so text files only warn.
    case "$path" in
      *.txt | *.xml) echo "warn $path cache-control='$browser'" ;;
      *) fail "$path cache-control='$browser'" ;;
    esac
  fi
  [ -z "$(field "$h" set-cookie)" ] || fail "$path sets a cookie on a cached page"
  [ "$failures" -gt "$before" ] || echo "ok   $path cf-cache-status=$cache age=$(field "$h" age)"
done

for path in "${PRIVATE[@]}"; do
  headers "$path" >/dev/null
  h=$(headers "$path")
  cache=$(field "$h" cf-cache-status | tr '[:lower:]' '[:upper:]')
  case "$cache" in
    "" | DYNAMIC | BYPASS) echo "ok   $path cf-cache-status=${cache:-none}" ;;
    *) fail "$path is cached at the edge (cf-cache-status=$cache)" ;;
  esac
done

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "edge cache verified on ${ORIGIN}"

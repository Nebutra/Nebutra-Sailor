#!/usr/bin/env bash
#
# Read-only audit of the things that turn into an Upstash bill.
#
#   UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… scripts/redis-cost-audit.sh
#
# Upstash bills per command on pay-as-you-go, not per gigabyte, so the number
# that matters is command volume — memory is already capped by the plan. The
# one thing that grows without bound is keys written with no TTL: they are
# never reclaimed, they push the working set toward the cap, and nothing
# reports them.

set -euo pipefail

URL="${UPSTASH_REDIS_REST_URL:-}"
TOKEN="${UPSTASH_REDIS_REST_TOKEN:-}"
if [[ -z "$URL" || -z "$TOKEN" ]]; then
  echo "usage: UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=… $0" >&2
  exit 2
fi

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
cmd() { curl -sS --max-time 30 "$URL/$1" -H "Authorization: Bearer $TOKEN"; }

say "Reachability"
PING=$(cmd ping)
case "$PING" in
  *PONG*) echo "  PONG" ;;
  *ALLOWLIST*)
    echo "  Blocked by IP allowlist. Workers egress from a large, changing set"
    echo "  of Cloudflare addresses, so an allowlist cannot be made to fit them"
    echo "  — it has to be empty for the gateway to reach Redis at all."
    echo "  $PING" >&2; exit 1 ;;
  *) echo "  $PING" >&2; exit 1 ;;
esac

say "Memory and policy"
cmd info | python3 -c "
import json,sys
info = json.load(sys.stdin)['result'].replace(chr(13),'')
f = dict(l.split(':',1) for l in info.split(chr(10)) if ':' in l and not l.startswith('#'))
def g(k, d='?'): return f.get(k, d)
used, cap = int(g('used_memory','0')), int(g('maxmemory','0'))
pct = (100.0*used/cap) if cap else 0
print(f\"  used            {g('used_memory_human')} of {g('maxmemory_human')}  ({pct:.1f}%)\")
print(f\"  eviction policy {g('maxmemory_policy')}\")
print(f\"  evicted keys    {g('evicted_keys')}\")
print(f\"  expired keys    {g('expired_keys')}\")
hits, misses = int(g('keyspace_hits','0')), int(g('keyspace_misses','0'))
tot = hits + misses
print(f\"  hit rate        {(100.0*hits/tot if tot else 0):.1f}%  ({hits} hit / {misses} miss)\")
print()
print(f\"  commands served {g('total_commands_processed')}   <- the billed meter on pay-as-you-go\")
print(f\"  connected       {g('connected_clients')}\")
for k,v in f.items():
    if k.startswith('db'):
        print()
        print(f'  {k}: {v.strip()}')
        parts = dict(p.split('=') for p in v.strip().split(','))
        keys, expires = int(parts.get('keys',0)), int(parts.get('expires',0))
        forever = keys - expires
        if forever > 0:
            print(f'  ** {forever} key(s) carry no TTL — these are never reclaimed **')
        else:
            print('  every key carries a TTL')
"

say "Keys with no TTL"
# Asked directly rather than inferred from INFO's keyspace line, which lags
# behind deletes and will otherwise report keys that are already gone.
# Sampled, not exhaustive: SCAN over a large keyspace is itself a lot of
# billed commands, and this runs to spot a pattern, not to take an inventory.
SAMPLE=$(cmd "scan/0/count/100" | python3 -c "
import json,sys
r = json.load(sys.stdin).get('result') or ['0', []]
print(' '.join(r[1]) if len(r) > 1 else '')
")

if [[ -z "${SAMPLE// }" ]]; then
  echo "  keyspace is empty"
else
  TOTAL=0; FOREVER=0
  for k in $SAMPLE; do
    TOTAL=$((TOTAL + 1))
    TTL=$(cmd "ttl/$k" | python3 -c "import json,sys; print(json.load(sys.stdin).get('result'))")
    # -1 means the key exists with no expiry set; -2 means it is already gone.
    if [[ "$TTL" == "-1" ]]; then
      FOREVER=$((FOREVER + 1))
      echo "  no TTL: $k"
    fi
  done
  echo "  $FOREVER of $TOTAL sampled key(s) have no TTL"
fi

cat <<'EOF'

Reading this:
  · Command count is the bill. A hit rate collapsing means the cache stopped
    working and every miss is now two commands plus a database round trip.
  · Any key with no TTL is permanent. The code writes TTLs everywhere today;
    this is here to catch the one that eventually does not.
  · Eviction policy `optimistic-volatile` evicts keys that have a TTL. That is
    right for cache, but idempotency locks and rate-limit buckets also carry
    TTLs — under real memory pressure they can be evicted too, which shows up
    as duplicate work rather than as an error. Memory headroom is a
    correctness property here, not just a cost one.
  · A hard monthly spend cap is set in the Upstash console, not here. Nothing
    in this repo can enforce it.
EOF

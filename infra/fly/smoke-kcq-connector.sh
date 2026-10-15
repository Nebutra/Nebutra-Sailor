#!/bin/sh
# Validate real data on the Machine, beyond dependency-only health probes.
set -eu
# Connectors share one Machine: tdx 8081, binance 8082, python 8083 (kcq-supervisor.py).
case "$CONNECTOR" in
  tdx) port=8081 ;;
  binance) port=8082 ;;
  python) port=8083 ;;
  *) echo "Unknown CONNECTOR: $CONNECTOR" >&2; exit 2 ;;
esac
base=http://127.0.0.1:${KCQ_CONNECTOR_PORT:-$port}
if [ "$CONNECTOR" = binance ]; then
  api="$base/api/v1/market-data"
  curl -fsS --max-time 25 "$api/sources/binance/probe" |
    jq -e '.data.capabilities.trades.live == true'
  curl -fsS --max-time 25 -H 'Content-Type: application/json' \
    -d '{"sourceId":"binance","instrument":{"id":"binance:spot:BTCUSDT","symbol":"BTCUSDT","exchange":"BINANCE"},"period":"1min","adjustment":"none","limit":5}' \
    "$api/bars" |
    jq -e '{count:(.data.items|length),last:.data.items[-1]} | select(.count > 0 and .last.close > 0 and .last.timestamp > ((now - 10*60)*1000))'
  curl -fsS --max-time 25 "$api/sources/binance/depth?symbol=BTCUSDT" |
    jq -e '(.data.bids | length) > 0 and (.data.asks | length) > 0'
  stream=$(mktemp)
  trap 'rm -f "$stream"' EXIT
  curl -fsSN --max-time 12 "$api/sources/binance/trades/stream?symbol=BTCUSDT&kind=aggregated" > "$stream" || test "$?" = 28
  sed -n 's/^data: //p' "$stream" | jq -se 'any(.[]; .type == "trades" and (.trades | length) > 0)'
  exit
fi
if [ "$CONNECTOR" = tdx ]; then
  source=gotdx
  keyword=600519
else
  source=tradingview
  keyword=AAPL
fi
search=$(curl -fsS --max-time 30 -H 'Content-Type: application/json' \
  -d "{\"sourceId\":\"$source\",\"keyword\":\"$keyword\",\"limit\":3}" \
  "$base/api/v1/market-data/instruments/search")
printf '%s\n' "$search" | jq -e '.data.items | length > 0'
if [ "$CONNECTOR" = tdx ]; then
  instrument=$(printf '%s' "$search" | jq '.data.items[0] | {id,symbol,exchange,providerRef}')
else
  instrument='{"id":"tradingview:NASDAQ:AAPL","symbol":"AAPL","exchange":"NASDAQ"}'
fi
body=$(jq -cn --arg source "$source" --argjson instrument "$instrument" \
  '{sourceId:$source,instrument:$instrument,period:"daily",adjustment:"none",limit:20}')
curl -fsS --max-time 30 -H 'Content-Type: application/json' -d "$body" \
  "$base/api/v1/market-data/bars" |
  jq -e '{count:(.data.items|length),last:.data.items[-1]} | select(.count > 0 and .last.close > 0 and .last.timestamp > ((now - 10*86400)*1000))'

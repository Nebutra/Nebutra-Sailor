#!/bin/sh
# Validate real data on the Machine, beyond dependency-only health probes.
set -eu
base=http://localhost:8080
if [ "$CONNECTOR" = binance ]; then
  curl -fsS --max-time 20 "$base/api/binance/orderbook?symbol=btcusdt" |
    jq -e '(.bids | length) > 0 and (.asks | length) > 0'
  stream=$(mktemp)
  trap 'rm -f "$stream"' EXIT
  curl -fsSN --max-time 8 "$base/api/binance/depth-events?symbol=btcusdt" > "$stream" || test "$?" = 28
  sed -n 's/^data: //p' "$stream" | head -1 | jq -e 'select(.type == "snapshot")'
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

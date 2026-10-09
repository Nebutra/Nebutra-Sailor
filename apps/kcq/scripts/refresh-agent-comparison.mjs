/**
 * Refresh the agent replay's comparison series: real CSI 300 daily closes on the same trading days
 * as the hero's cached bars, so `comparison_create` in the replay draws a line that exists. Run by
 * hand after refresh-hero-bars.mjs; the file is committed.
 *
 *   node apps/kcq/scripts/refresh-agent-comparison.mjs [origin]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** GOTDX reference for 000300 (CSI 300), as instruments/search returns it. */
const INDEX = {
  id: "gotdx:index:0:000300",
  symbol: "000300",
  exchange: "SH",
  providerRef: { kind: "index", market: 1 },
};

const origin = process.argv[2] ?? "https://kcq.nebutra.com";
const hero = JSON.parse(
  readFileSync(new URL("../src/public/home/hero/cached-bars.json", import.meta.url), "utf8"),
);
const response = await fetch(`${origin}/market/tdx/api/v1/market-data/bars`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceId: "gotdx",
    instrument: INDEX,
    period: "daily",
    adjustment: "none",
    barAggregation: "original",
    limit: 160,
  }),
});
if (!response.ok) throw new Error(`bars request failed: ${response.status}`);
const { data } = await response.json();
// Only finite numbers reach the committed file: the response is untrusted network input.
const closes = new Map();
for (const bar of data.items) {
  const timestamp = Number(bar.timestamp);
  const close = Number(bar.close);
  if (!Number.isFinite(timestamp) || !Number.isFinite(close)) throw new Error("non-finite bar");
  closes.set(timestamp, close);
}
const series = hero.bars.map(([timestamp]) => [timestamp, closes.get(timestamp) ?? null]);
const missing = series.filter(([, close]) => close === null).length;
if (missing > 3) throw new Error(`${missing} hero trading days have no CSI 300 bar`);

const target = fileURLToPath(
  new URL("../src/public/home/agent/comparison-bars.json", import.meta.url),
);
writeFileSync(
  target,
  `${JSON.stringify({
    source: "gotdx",
    instrumentId: INDEX.id,
    symbol: INDEX.symbol,
    period: "daily",
    adjustment: "none",
    fetchedAt: new Date().toISOString(),
    columns: ["timestamp", "close"],
    bars: series,
  })}\n`,
);
console.log(`wrote ${series.length} closes (${missing} missing) to ${target}`);

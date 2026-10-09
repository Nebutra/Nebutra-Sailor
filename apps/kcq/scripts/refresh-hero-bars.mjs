/**
 * Refresh the hero's cached bars: the real daily bars the /home chart shows, labelled "Delayed",
 * when the live connector does not answer. They also seed the theme previews and the poster, so
 * every chart on the page is the same instrument. Run by hand; the file is committed.
 *
 *   node apps/kcq/scripts/refresh-hero-bars.mjs [origin]
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const HERO_INSTRUMENT = {
  id: "gotdx:stock:0:600519",
  symbol: "600519",
  exchange: "SH",
  providerRef: { kind: "stock", market: 1 },
};
export const HERO_QUERY = {
  period: "daily",
  adjustment: "qfq",
  barAggregation: "original",
  limit: 120,
};

const origin = process.argv[2] ?? "https://kcq.nebutra.com";
const response = await fetch(`${origin}/market/tdx/api/v1/market-data/bars`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sourceId: "gotdx", instrument: HERO_INSTRUMENT, ...HERO_QUERY }),
});
if (!response.ok) throw new Error(`bars request failed: ${response.status}`);
const { data } = await response.json();
// Only finite numbers reach the committed file: the response is untrusted network input.
const finite = (value, field) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`bar ${field} is not a finite number: ${value}`);
  return number;
};
const bars = data.items.map((bar) => [
  finite(bar.timestamp, "timestamp"),
  finite(bar.open, "open"),
  finite(bar.high, "high"),
  finite(bar.low, "low"),
  finite(bar.close, "close"),
  finite(bar.volume ?? 0, "volume"),
]);
const text = (value, field) => {
  if (typeof value !== "string" || !/^[\w:.-]{1,64}$/.test(value))
    throw new Error(`unexpected ${field}: ${value}`);
  return value;
};
if (bars.length < 60) throw new Error(`expected at least 60 bars, got ${bars.length}`);

const target = fileURLToPath(new URL("../src/public/home/hero/cached-bars.json", import.meta.url));
writeFileSync(
  target,
  `${JSON.stringify({
    source: "gotdx",
    instrumentId: text(data.instrumentId, "instrumentId"),
    symbol: HERO_INSTRUMENT.symbol,
    period: text(data.period, "period"),
    adjustment: text(data.adjustment, "adjustment"),
    timezone: data.timezone,
    fetchedAt: new Date().toISOString(),
    columns: ["timestamp", "open", "high", "low", "close", "volume"],
    bars,
  })}\n`,
);
console.log(`wrote ${bars.length} bars to ${target}`);

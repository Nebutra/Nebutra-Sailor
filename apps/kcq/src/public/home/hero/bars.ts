/**
 * The hero instrument and its cached daily bars (scripts/refresh-hero-bars.mjs). Shared by the
 * prerendered page (theme previews, agent replay, poster) and the lazy live chart, so every chart
 * on /home is the same real instrument.
 */
import cached from "./cached-bars.json";

export interface Bar {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/** GOTDX instrument reference for 600519 (Kweichow Moutai), as the V1 instruments/search returns it. */
export const HERO_INSTRUMENT = {
  id: "gotdx:stock:0:600519",
  symbol: "600519",
  exchange: "SH",
  providerRef: { kind: "stock", market: 1 },
} as const;

export const HERO_QUERY = {
  sourceId: "gotdx",
  period: "daily",
  adjustment: "qfq",
  barAggregation: "original",
  limit: 120,
} as const;

/** Same-origin, read-only connector route (infra/fly/kcq.nginx.conf `/market/tdx`). */
export const HERO_FEED_PATH = "/market/tdx";

export const CACHED_BARS: readonly Bar[] = cached.bars.map(
  ([timestamp, open, high, low, close, volume]) => ({ timestamp, open, high, low, close, volume }),
);

/** Trading date (exchange time zone) of a bar, as `YYYY-MM-DD`. */
export function tradingDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: cached.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

export interface Quote {
  readonly last: number;
  readonly change: number;
  readonly changePercent: number;
  readonly date: string;
}

export function quoteOf(bars: readonly Bar[]): Quote | null {
  const last = bars.at(-1);
  const previous = bars.at(-2);
  if (!last) return null;
  const base = previous?.close ?? last.open;
  return {
    last: last.close,
    change: last.close - base,
    changePercent: base ? ((last.close - base) / base) * 100 : 0,
    date: tradingDate(last.timestamp),
  };
}

/** Simple moving average of closes; `null` until the window is full. */
export function movingAverage(bars: readonly Bar[], window: number): (number | null)[] {
  let sum = 0;
  return bars.map((bar, index) => {
    sum += bar.close;
    if (index >= window) sum -= bars[index - window]!.close;
    return index >= window - 1 ? sum / window : null;
  });
}

/**
 * The series the hero shows: cached bars extended by the live ones. Live bars win on equal
 * timestamps. When the live window does not reach back to the cache (a stale cache), the live bars
 * stand alone, so the merge can never leave a hole between the two sets.
 */
export function mergeBars(base: readonly Bar[], incoming: readonly Bar[]): Bar[] {
  if (incoming.length === 0) return [...base];
  const lastBase = base.at(-1)?.timestamp ?? Number.NEGATIVE_INFINITY;
  if (incoming[0]!.timestamp > lastBase) return [...incoming];
  const byTime = new Map(base.map((bar) => [bar.timestamp, bar]));
  for (const bar of incoming) byTime.set(bar.timestamp, bar);
  return [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/** Longest calendar gap between consecutive bars, in days. */
export function largestGapDays(bars: readonly Bar[]): number {
  let largest = 0;
  for (let index = 1; index < bars.length; index++) {
    largest = Math.max(largest, (bars[index]!.timestamp - bars[index - 1]!.timestamp) / 86_400_000);
  }
  return largest;
}

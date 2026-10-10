import { describe, expect, it } from "vitest";
import { type Bar, CACHED_BARS, largestGapDays, mergeBars, sameBars } from "./bars";

/** SSE closures: Golden Week and Spring Festival run up to 9 calendar days between sessions. */
const MAX_MARKET_GAP_DAYS = 10;
const DAY = 86_400_000;
const bar = (timestamp: number): Bar => ({ timestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });

describe("hero series", () => {
  it("the cached bars are one continuous daily series", () => {
    expect(CACHED_BARS.length).toBeGreaterThanOrEqual(60);
    expect(largestGapDays(CACHED_BARS)).toBeLessThanOrEqual(MAX_MARKET_GAP_DAYS);
    for (let index = 1; index < CACHED_BARS.length; index++) {
      expect(CACHED_BARS[index]!.timestamp).toBeGreaterThan(CACHED_BARS[index - 1]!.timestamp);
    }
  });

  it("extends the cache with overlapping live bars without a hole", () => {
    const last = CACHED_BARS.at(-1)!.timestamp;
    const live = [...CACHED_BARS.slice(-40).map((b) => ({ ...b, close: b.close + 1 })), bar(last + DAY), bar(last + 2 * DAY)];
    const merged = mergeBars(CACHED_BARS, live);
    expect(merged).toHaveLength(CACHED_BARS.length + 2);
    expect(merged.at(-3)!.close).toBe(CACHED_BARS.at(-1)!.close + 1);
    expect(largestGapDays(merged)).toBeLessThanOrEqual(MAX_MARKET_GAP_DAYS);
  });

  it("drops a stale cache instead of bridging it with a gap", () => {
    const start = CACHED_BARS.at(-1)!.timestamp + 60 * DAY;
    const live = Array.from({ length: 30 }, (_, index) => bar(start + index * DAY));
    const merged = mergeBars(CACHED_BARS, live);
    expect(merged).toEqual(live);
    expect(largestGapDays(merged)).toBeLessThanOrEqual(MAX_MARKET_GAP_DAYS);
  });

  it("treats an unchanged poll as the same series and any changed field as new", () => {
    const copy = CACHED_BARS.map((b) => ({ ...b }));
    expect(sameBars(CACHED_BARS, copy)).toBe(true);
    expect(sameBars(CACHED_BARS, copy.slice(1))).toBe(false);
    const moved = copy.map((b, index) => (index === copy.length - 1 ? { ...b, close: b.close + 0.01 } : b));
    expect(sameBars(CACHED_BARS, moved)).toBe(false);
    const traded = copy.map((b, index) => (index === copy.length - 1 ? { ...b, volume: b.volume + 1 } : b));
    expect(sameBars(CACHED_BARS, traded)).toBe(false);
  });
});

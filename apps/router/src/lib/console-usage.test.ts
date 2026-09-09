import { describe, expect, it } from "vitest";
import { parseGranularity, parseLimit, parseWindow, toCsv } from "@/lib/console-usage";

const NOW = new Date("2026-09-08T04:30:00Z");

function url(query = ""): URL {
  return new URL(`https://router.nebutra.com/api/console/v1/usage/summary${query}`);
}

describe("parseWindow", () => {
  it("defaults to month-to-date in UTC", () => {
    const parsed = parseWindow(url(), NOW);
    if ("error" in parsed) throw new Error("expected a window");
    expect(parsed.window.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(parsed.window.to.getTime()).toBe(NOW.getTime() + 1);
  });

  it("does not shift the month start by the server's local offset", () => {
    // The tell: a local-time implementation returns 2026-08-31T… in any zone
    // west of UTC, and every "this month" total is then wrong by one day.
    const parsed = parseWindow(url(), new Date("2026-09-01T00:30:00Z"));
    if ("error" in parsed) throw new Error("expected a window");
    expect(parsed.window.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("accepts ISO strings and epoch milliseconds alike", () => {
    const iso = parseWindow(url("?from=2026-08-01T00:00:00Z&to=2026-09-01T00:00:00Z"), NOW);
    const epoch = parseWindow(url(`?from=${Date.UTC(2026, 7, 1)}&to=${Date.UTC(2026, 8, 1)}`), NOW);
    if ("error" in iso || "error" in epoch) throw new Error("expected windows");
    expect(iso.window.from.toISOString()).toBe(epoch.window.from.toISOString());
    expect(iso.window.to.toISOString()).toBe(epoch.window.to.toISOString());
  });

  it("refuses an unparseable bound rather than quietly using the default", async () => {
    const parsed = parseWindow(url("?from=last-tuesday"), NOW);
    if (!("error" in parsed)) throw new Error("expected a refusal");
    expect(parsed.error.status).toBe(400);
    await expect(parsed.error.json()).resolves.toMatchObject({ error: "`from` is not a date." });
  });

  it("refuses an inverted or empty window", () => {
    const inverted = parseWindow(url("?from=2026-09-01T00:00:00Z&to=2026-08-01T00:00:00Z"), NOW);
    const empty = parseWindow(url("?from=2026-09-01T00:00:00Z&to=2026-09-01T00:00:00Z"), NOW);
    expect("error" in inverted).toBe(true);
    expect("error" in empty).toBe(true);
  });

  it("refuses a window wider than a year", () => {
    const parsed = parseWindow(url("?from=2020-01-01T00:00:00Z&to=2026-01-01T00:00:00Z"), NOW);
    expect("error" in parsed).toBe(true);
  });
});

describe("parseGranularity", () => {
  it("defaults to day and accepts hour", () => {
    expect(parseGranularity(url())).toBe("day");
    expect(parseGranularity(url("?granularity=hour"))).toBe("hour");
  });

  it("refuses anything else", () => {
    const parsed = parseGranularity(url("?granularity=week"));
    expect(typeof parsed).not.toBe("string");
  });
});

describe("parseLimit", () => {
  it("falls back on nonsense and clamps to the ceiling", () => {
    expect(parseLimit(url())).toBe(50);
    expect(parseLimit(url("?limit=-3"))).toBe(50);
    expect(parseLimit(url("?limit=abc"))).toBe(50);
    expect(parseLimit(url("?limit=20"))).toBe(20);
    expect(parseLimit(url("?limit=99999"))).toBe(500);
  });
});

describe("toCsv", () => {
  it("quotes every cell and escapes embedded quotes", () => {
    const csv = toCsv(["model", "note"], [["gpt-x", 'he said "hi", then left']]);
    expect(csv).toContain('"gpt-x","he said ""hi"", then left"');
  });

  it("writes an empty cell for a missing value rather than the word null", () => {
    expect(toCsv(["a"], [[null]])).toContain('""');
    expect(toCsv(["a"], [[null]])).not.toContain("null");
  });
});

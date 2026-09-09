import { describe, expect, it } from "vitest";
import {
  endOfUtcDayIso,
  formatAmount,
  formatBucket,
  formatDateTime,
  formatLatency,
  formatOptionalAmount,
  formatTokens,
  granularityFor,
  parseOptionalPositive,
  parseRange,
  parseRequiredAmount,
  rangeWindow,
  toDateInputValue,
} from "@/lib/console-format";

describe("formatAmount", () => {
  it("keeps a sub-cent charge visible instead of rounding it to free", () => {
    expect(formatAmount(0.000042)).toBe("0.000042");
    expect(formatAmount(0.0031)).toBe("0.003100");
  });

  it("prints cents for anything a customer would call an amount", () => {
    expect(formatAmount(412.1)).toBe("412.10");
    expect(formatAmount(0.5)).toBe("0.5000");
  });

  it("prints a real zero as zero, not as a rounded charge", () => {
    expect(formatAmount(0)).toBe("0.00");
  });

  it("refuses to invent a number for a missing price", () => {
    expect(formatOptionalAmount(null)).toBe("—");
    expect(formatAmount(Number.NaN)).toBe("—");
  });
});

describe("formatTokens", () => {
  it("scales without lying about the magnitude", () => {
    expect(formatTokens(842)).toBe("842");
    expect(formatTokens(12_400)).toBe("12.4k");
    expect(formatTokens(3_120_000)).toBe("3.12M");
  });
});

describe("time", () => {
  it("prints UTC, because every window and cap in this product resets on it", () => {
    expect(formatDateTime("2026-09-08T14:03:22.000Z")).toBe("2026-09-08 14:03 UTC");
  });

  it("prints an em dash rather than `Invalid Date`", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not a date")).toBe("—");
    expect(toDateInputValue(null)).toBe("");
  });

  it("labels buckets at the resolution the chart is drawn at", () => {
    expect(formatBucket("2026-09-08T14:00:00.000Z", "hour")).toBe("09-08 14:00");
    expect(formatBucket("2026-09-08T00:00:00.000Z", "day")).toBe("09-08");
  });

  it("formats latency in the unit a human reads", () => {
    expect(formatLatency(842)).toBe("842 ms");
    expect(formatLatency(2400)).toBe("2.4 s");
    expect(formatLatency(null)).toBe("—");
  });
});

describe("parseRequiredAmount", () => {
  it("rejects blank instead of posting Number('') === 0", () => {
    const parsed = parseRequiredAmount("", { min: 1, max: 100 });
    expect(parsed.ok).toBe(false);
  });

  it("names the bound it broke", () => {
    expect(parseRequiredAmount("0.5", { min: 1, max: 100 })).toMatchObject({ ok: false });
    expect(parseRequiredAmount("101", { min: 1, max: 100 })).toMatchObject({ ok: false });
    expect(parseRequiredAmount("abc", { min: 1, max: 100 })).toMatchObject({ ok: false });
  });

  it("accepts a real amount", () => {
    expect(parseRequiredAmount(" 25 ", { min: 1, max: 100 })).toEqual({ ok: true, value: 25 });
  });
});

describe("parseOptionalPositive", () => {
  it("reads blank as `no ceiling`, which is what the API means by null", () => {
    expect(parseOptionalPositive("", { max: 1000 })).toEqual({ ok: true, value: null });
  });

  it("rejects zero and negatives — an unset ceiling is not a ceiling of nothing", () => {
    expect(parseOptionalPositive("0", { max: 1000 })).toMatchObject({ ok: false });
    expect(parseOptionalPositive("-3", { max: 1000 })).toMatchObject({ ok: false });
  });

  it("enforces integers where the field is a count", () => {
    expect(parseOptionalPositive("2.5", { max: 1000, integer: true })).toMatchObject({ ok: false });
    expect(parseOptionalPositive("2", { max: 1000, integer: true })).toEqual({
      ok: true,
      value: 2,
    });
  });
});

describe("endOfUtcDayIso", () => {
  it("covers the whole day that was typed", () => {
    expect(endOfUtcDayIso("2026-10-01")).toBe("2026-10-01T23:59:59.000Z");
  });

  it("rejects anything that is not a date", () => {
    expect(endOfUtcDayIso("01/10/2026")).toBeNull();
    expect(endOfUtcDayIso("")).toBeNull();
  });
});

describe("ranges", () => {
  const now = new Date("2026-09-08T14:03:00.000Z");

  it("falls back to month-to-date for an unknown range", () => {
    expect(parseRange(null)).toBe("mtd");
    expect(parseRange("last-year")).toBe("mtd");
    expect(parseRange("7d")).toBe("7d");
  });

  it("starts month-to-date at the first instant of the UTC month", () => {
    expect(rangeWindow("mtd", now).from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("measures rolling windows back from now", () => {
    expect(rangeWindow("24h", now).from.toISOString()).toBe("2026-09-07T14:03:00.000Z");
    expect(rangeWindow("7d", now).from.toISOString()).toBe("2026-09-01T14:03:00.000Z");
  });

  it("buckets a one-day window hourly and everything else daily", () => {
    expect(granularityFor("24h")).toBe("hour");
    expect(granularityFor("30d")).toBe("day");
  });
});

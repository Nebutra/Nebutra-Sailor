import { describe, expect, it } from "vitest";
import {
  formatDayKey,
  formatDuration,
  formatLatency,
  formatRelative,
  formatUptime,
  formatUtc,
} from "./format";

describe("formatUptime", () => {
  it("truncates instead of rounding so a near-miss never reads 100%", () => {
    expect(formatUptime(0.99996)).toBe("99.99%");
    expect(formatUptime(1)).toBe("100.00%");
    expect(formatUptime(0.5)).toBe("50.00%");
    expect(formatUptime(0.9)).toBe("90.00%");
  });
  it("shows a dash when nothing was measured", () => {
    expect(formatUptime(null)).toBe("—");
    expect(formatUptime(Number.NaN)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("uses the largest two units", () => {
    expect(formatDuration(20_000, "en")).toBe("1m");
    expect(formatDuration(125 * 60_000, "en")).toBe("2h 5m");
    expect(formatDuration(120 * 60_000, "en")).toBe("2h");
    expect(formatDuration((26 * 60 + 30) * 60_000, "en")).toBe("1d 2h");
    expect(formatDuration(125 * 60_000, "zh-CN")).toBe("2 小时 5 分钟");
  });
});

describe("formatLatency", () => {
  it("switches to seconds past one second", () => {
    expect(formatLatency(184.4, "en")).toBe("184ms");
    expect(formatLatency(1530, "en")).toBe("1.5s");
    expect(formatLatency(184, "zh-CN")).toBe("184 毫秒");
    expect(formatLatency(null, "en")).toBe("—");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-10-16T08:00:00Z");
  it("reads the largest whole unit", () => {
    expect(formatRelative(new Date("2026-10-16T07:59:50Z"), now, "en")).toBe("now");
    expect(formatRelative(new Date("2026-10-16T07:58:00Z"), now, "en")).toBe("2 minutes ago");
    expect(formatRelative(new Date("2026-10-16T07:58:00Z"), now, "zh-CN")).toBe("2分钟前");
    expect(formatRelative(new Date("2026-10-16T05:00:00Z"), now, "en")).toBe("3 hours ago");
  });
});

describe("dates", () => {
  it("formats day keys without shifting across time zones", () => {
    expect(formatDayKey("2026-10-01", "en")).toBe("Oct 1, 2026");
    expect(formatUtc(new Date("2026-10-16T08:05:30Z"))).toBe("2026-10-16 08:05 UTC");
  });
});

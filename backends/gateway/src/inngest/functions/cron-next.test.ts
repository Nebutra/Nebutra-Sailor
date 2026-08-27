import { describe, expect, it } from "vitest";
import { cronNext, isValidCron } from "./cron-next.js";

describe("cronNext", () => {
  it("returns the next minute boundary after the current instant", () => {
    expect(cronNext("* * * * *", new Date("2026-06-06T01:01:20.407Z"))?.toISOString()).toBe(
      "2026-06-06T01:02:00.000Z",
    );
  });

  it("supports range, list, and step syntax in UTC", () => {
    expect(cronNext("*/15 1-3 * * *", new Date("2026-06-06T01:14:59Z"))?.toISOString()).toBe(
      "2026-06-06T01:15:00.000Z",
    );
    expect(cronNext("5,35 4 * * *", new Date("2026-06-06T04:05:00Z"))?.toISOString()).toBe(
      "2026-06-06T04:35:00.000Z",
    );
  });

  it("uses standard cron OR semantics when day-of-month and day-of-week are both restricted", () => {
    expect(cronNext("0 9 15 * 2", new Date("2026-06-09T00:00:00Z"))?.toISOString()).toBe(
      "2026-06-09T09:00:00.000Z",
    );
  });

  it("returns null for malformed or unsupported cron expressions", () => {
    expect(cronNext("0 0 * * * *", new Date("2026-06-06T00:00:00Z"))).toBeNull();
    expect(cronNext("@daily", new Date("2026-06-06T00:00:00Z"))).toBeNull();
    expect(cronNext("*/0 * * * *", new Date("2026-06-06T00:00:00Z"))).toBeNull();
    expect(cronNext("0 0 31 2 *", new Date("2026-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("isValidCron", () => {
  it("accepts parseable 5-field cron expressions in the MVP surface", () => {
    expect(isValidCron("* * * * *")).toBe(true);
    expect(isValidCron("*/5 9-17 * * 1,2,3,4,5")).toBe(true);
    expect(isValidCron("? * * * *")).toBe(true);
  });

  it("rejects malformed expressions and library features outside the MVP surface", () => {
    expect(isValidCron("")).toBe(false);
    expect(isValidCron("0 0 * * * *")).toBe(false);
    expect(isValidCron("@daily")).toBe(false);
    expect(isValidCron("0 0 L * *")).toBe(false);
    expect(isValidCron("*/0 * * * *")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  applyQuotaObservation,
  forecastWithinHours,
  nextPullDelaySeconds,
  type QuotaWindowSnapshot,
  ratioAlertLevel,
  shouldAlertForecast,
  shouldAlertRatio,
  stateFor,
} from "./quota";

const base: QuotaWindowSnapshot = {
  unit: "USD",
  limit: 14,
  used: 0,
  resetsAt: new Date("2026-09-30T05:00:00Z"),
  windowSeconds: 5 * 3600,
  sourceOfTruth: "SELF_METERED",
  state: "NOMINAL",
  burnRatePerHour: null,
  forecastExhaustAt: null,
  lastAlertLevel: "NONE",
  lastForecastAlertAt: null,
  lastSampleAt: null,
};

describe("stateFor", () => {
  it("is NOMINAL with no limit", () => {
    expect(stateFor(1000, null)).toBe("NOMINAL");
    expect(stateFor(1000, 0)).toBe("NOMINAL");
  });
  it("is NOMINAL below 80%", () => {
    expect(stateFor(7, 14)).toBe("NOMINAL");
  });
  it("is THROTTLED at/above 80% and below 100%", () => {
    expect(stateFor(11.3, 14)).toBe("THROTTLED");
    expect(stateFor(13.9, 14)).toBe("THROTTLED");
  });
  it("is EXHAUSTED at/above 100%", () => {
    expect(stateFor(14, 14)).toBe("EXHAUSTED");
    expect(stateFor(20, 14)).toBe("EXHAUSTED");
  });
});

describe("ratioAlertLevel / shouldAlertRatio", () => {
  it("escalates through the ladder", () => {
    expect(ratioAlertLevel(0, 14)).toBe("NONE");
    expect(ratioAlertLevel(11.3, 14)).toBe("WARN_80");
    expect(ratioAlertLevel(13.5, 14)).toBe("WARN_95");
    expect(ratioAlertLevel(14, 14)).toBe("EXHAUSTED");
  });

  it("only fires on escalation, never flat or recovering", () => {
    expect(shouldAlertRatio("NONE", "WARN_80")).toBe(true);
    expect(shouldAlertRatio("WARN_80", "WARN_80")).toBe(false);
    expect(shouldAlertRatio("WARN_95", "WARN_80")).toBe(false);
    expect(shouldAlertRatio("WARN_80", "EXHAUSTED")).toBe(true);
  });
});

describe("shouldAlertForecast", () => {
  const now = new Date("2026-09-30T00:00:00Z");
  it("never fires when not forecasting soon", () => {
    expect(shouldAlertForecast(false, null, now, 1000)).toBe(false);
  });
  it("fires the first time", () => {
    expect(shouldAlertForecast(true, null, now, 1000)).toBe(true);
  });
  it("respects cooldown", () => {
    expect(shouldAlertForecast(true, new Date(now.getTime() - 500), now, 1000)).toBe(false);
    expect(shouldAlertForecast(true, new Date(now.getTime() - 1500), now, 1000)).toBe(true);
  });
});

describe("forecastWithinHours", () => {
  const now = new Date("2026-09-30T00:00:00Z");
  it("false with no forecast", () => {
    expect(forecastWithinHours(null, now, 6)).toBe(false);
  });
  it("true when within the window", () => {
    expect(forecastWithinHours(new Date(now.getTime() + 3 * 3_600_000), now, 6)).toBe(true);
  });
  it("false when beyond the window", () => {
    expect(forecastWithinHours(new Date(now.getTime() + 10 * 3_600_000), now, 6)).toBe(false);
  });
});

describe("nextPullDelaySeconds", () => {
  it("pulls again soon when throttled or exhausted", () => {
    expect(nextPullDelaySeconds("THROTTLED", false)).toBe(900);
    expect(nextPullDelaySeconds("EXHAUSTED", false)).toBe(900);
  });
  it("pulls sooner than idle when forecasting soon, even below the ratio threshold", () => {
    expect(nextPullDelaySeconds("NOMINAL", true)).toBe(1800);
  });
  it("pulls rarely when idle", () => {
    expect(nextPullDelaySeconds("NOMINAL", false)).toBe(3600);
  });
});

describe("applyQuotaObservation — self-metered accumulation", () => {
  it("accumulates deltas", () => {
    const now = new Date("2026-09-30T01:00:00Z");
    const t1 = applyQuotaObservation(base, { deltaUsed: 5, sourceOfTruth: "SELF_METERED" }, now);
    expect(t1.snapshot.used).toBe(5);
    expect(t1.snapshot.state).toBe("NOMINAL");

    const now2 = new Date("2026-09-30T02:00:00Z");
    const t2 = applyQuotaObservation(
      t1.snapshot,
      { deltaUsed: 8, sourceOfTruth: "SELF_METERED" },
      now2,
    );
    expect(t2.snapshot.used).toBe(13);
    expect(t2.snapshot.state).toBe("THROTTLED"); // 13/14 = 92.8%
    expect(t2.snapshot.burnRatePerHour).toBeGreaterThan(0);
  });

  it("crosses into EXHAUSTED at/above the limit", () => {
    const now = new Date("2026-09-30T01:00:00Z");
    const t = applyQuotaObservation(base, { deltaUsed: 14, sourceOfTruth: "SELF_METERED" }, now);
    expect(t.snapshot.state).toBe("EXHAUSTED");
  });

  it("rolls itself over once resetsAt passes, fast-forwarding through missed cycles", () => {
    const exhausted: QuotaWindowSnapshot = {
      ...base,
      used: 14,
      state: "EXHAUSTED",
      lastAlertLevel: "EXHAUSTED",
      lastSampleAt: new Date("2026-09-30T04:00:00Z"),
    };
    // resetsAt was 05:00Z; now is well past two full 5h cycles later.
    const now = new Date("2026-09-30T16:00:00Z");
    const t = applyQuotaObservation(
      exhausted,
      { deltaUsed: 1, sourceOfTruth: "SELF_METERED" },
      now,
    );
    expect(t.snapshot.used).toBe(1);
    expect(t.snapshot.state).toBe("NOMINAL");
    expect(t.snapshot.lastAlertLevel).toBe("NONE");
    expect(t.snapshot.resetsAt?.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("applyQuotaObservation — header/endpoint replace semantics", () => {
  it("replaces used with the absolute reading rather than accumulating", () => {
    const withPrior: QuotaWindowSnapshot = { ...base, used: 5, sourceOfTruth: "HEADER" };
    const now = new Date("2026-09-30T01:00:00Z");
    const t = applyQuotaObservation(withPrior, { used: 9, sourceOfTruth: "HEADER" }, now);
    expect(t.snapshot.used).toBe(9);
  });

  it("derives used from limit - remaining", () => {
    const now = new Date("2026-09-30T01:00:00Z");
    const t = applyQuotaObservation(
      { ...base, sourceOfTruth: "HEADER" },
      { remaining: 2, limit: 14, sourceOfTruth: "HEADER" },
      now,
    );
    expect(t.snapshot.used).toBe(12);
    expect(t.snapshot.state).toBe("THROTTLED");
  });

  it("adopts the provider's own resetsAt", () => {
    const now = new Date("2026-09-30T01:00:00Z");
    const laterReset = new Date("2026-09-30T09:00:00Z");
    const t = applyQuotaObservation(
      { ...base, sourceOfTruth: "HEADER" },
      { used: 1, resetsAt: laterReset, sourceOfTruth: "HEADER" },
      now,
    );
    expect(t.snapshot.resetsAt).toBe(laterReset);
  });

  it("recovers automatically when the provider's own counter drops (its own rollover)", () => {
    const exhausted: QuotaWindowSnapshot = {
      ...base,
      used: 14,
      state: "EXHAUSTED",
      sourceOfTruth: "HEADER",
      lastAlertLevel: "EXHAUSTED",
    };
    const now = new Date("2026-09-30T06:00:00Z");
    const t = applyQuotaObservation(exhausted, { used: 0, sourceOfTruth: "HEADER" }, now);
    expect(t.snapshot.state).toBe("NOMINAL");
    expect(t.snapshot.lastAlertLevel).toBe("NONE");
  });
});

describe("applyQuotaObservation — header-less 429", () => {
  it("forces EXHAUSTED until the given instant with no ratio math", () => {
    const now = new Date("2026-09-30T01:00:00Z");
    const until = new Date("2026-09-30T01:05:00Z");
    const t = applyQuotaObservation(
      { ...base, limit: null, sourceOfTruth: "HEADER" },
      { sourceOfTruth: "HEADER", forceExhaustedUntil: until },
      now,
    );
    expect(t.snapshot.state).toBe("EXHAUSTED");
    expect(t.snapshot.resetsAt).toBe(until);
  });

  it("recovers on its own once now passes the forced instant", () => {
    const until = new Date("2026-09-30T01:05:00Z");
    const forced: QuotaWindowSnapshot = {
      ...base,
      limit: null,
      used: 0,
      state: "EXHAUSTED",
      resetsAt: until,
      sourceOfTruth: "HEADER",
    };
    const now = new Date("2026-09-30T01:06:00Z");
    const t = applyQuotaObservation(forced, { sourceOfTruth: "HEADER" }, now);
    expect(t.snapshot.state).toBe("NOMINAL");
  });
});

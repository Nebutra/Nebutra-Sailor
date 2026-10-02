import { applyQuotaObservation, ratioAlertLevel, shouldAlertRatio } from "@nebutra/router-supply";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nebutra/db", () => ({ getSystemDb: vi.fn(() => ({})) }));
const loggerError = vi.hoisted(() => vi.fn());
vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: loggerError, debug: vi.fn() },
}));

const notifyOpsAlert = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@nebutra/status", () => ({ notifyOpsAlert }));

// ADR 2026-09-30 "Event-driven execution": the quota layer now also emits a
// supply/model.signal{kind: quota_threshold} alongside its existing
// notifyOpsAlert page, so the generic event stream carries this too.
const emitSupplyEvent = vi.hoisted(() => vi.fn(async () => ({ ok: true, ids: ["evt_1"] })));
vi.mock("./events", () => ({ emitSupplyEvent }));

vi.mock("./capability", () => ({ credentialFor: vi.fn() }));
vi.mock("./clients", () => ({ newApiFindChannel: vi.fn(), newApiLogin: vi.fn() }));

/**
 * A minimal fake of `RouterSupplyRepository.applyQuotaObservation` that
 * drives the *real* pure reducer/decision functions from
 * `@nebutra/router-supply` (the same ones `quota.ts` itself injects), rather
 * than re-implementing their decision logic — this test exercises whether
 * `quota.ts`'s orchestration reacts correctly to a real ratio-alert
 * escalation, not whether a hand-rolled fake agrees with itself.
 */
function fakeApplyQuotaObservation(initial: {
  used: number;
  limit: number | null;
  lastAlertLevel: string;
}) {
  let state = { ...initial };
  return vi.fn(
    async (
      sourceKey: string,
      windowName: string,
      observation: Record<string, unknown>,
      applyFn: (window: unknown, obs: unknown, now: Date) => { snapshot: Record<string, unknown> },
      decide: {
        ratioAlertLevel: (used: number, limit: number | null) => string;
        shouldAlertRatio: (prior: string, next: string) => boolean;
        forecastWithinHours: (a: unknown, b: Date, c: number) => boolean;
        shouldAlertForecast: (a: boolean, b: unknown, c: Date, d: number) => boolean;
      },
      now: Date,
    ) => {
      const before = {
        unit: "REQUESTS",
        limit: state.limit,
        used: state.used,
        resetsAt: null,
        windowSeconds: null,
        sourceOfTruth: "HEADER",
        state: "NOMINAL",
        burnRatePerHour: null,
        forecastExhaustAt: null,
        lastAlertLevel: state.lastAlertLevel,
        lastForecastAlertAt: null,
        lastSampleAt: null,
      };
      const { snapshot } = applyFn(before, observation, now);
      state = {
        used: snapshot.used as number,
        limit: snapshot.limit as number | null,
        lastAlertLevel: snapshot.lastAlertLevel as string,
      };

      const priorLevel = snapshot.lastAlertLevel as string;
      const nextLevel = decide.ratioAlertLevel(
        snapshot.used as number,
        snapshot.limit as number | null,
      );
      const ratioFired = decide.shouldAlertRatio(priorLevel, nextLevel);
      if (ratioFired) state.lastAlertLevel = nextLevel;

      // `QuotaWindowRow` (what the real repository returns) uses
      // `usedAmount`/`limitAmount`; the pure reducer's `QuotaSnapshotInput`
      // uses `used`/`limit` — the real repository renames these when it maps
      // the DB row back (`toQuotaWindowRow`); this fake does the same.
      return {
        window: {
          id: "supqw_1",
          sourceId: "supsrc_1",
          sourceKey,
          name: windowName,
          unit: snapshot.unit,
          usedAmount: snapshot.used,
          limitAmount: snapshot.limit,
          resetsAt: snapshot.resetsAt,
          windowSeconds: snapshot.windowSeconds,
          sourceOfTruth: snapshot.sourceOfTruth,
          state: snapshot.state,
          burnRatePerHour: snapshot.burnRatePerHour,
          forecastExhaustAt: snapshot.forecastExhaustAt,
          lastAlertLevel: state.lastAlertLevel,
          lastAlertAt: null,
          lastForecastAlertAt: snapshot.lastForecastAlertAt,
          lastSampleAt: snapshot.lastSampleAt,
          nextPullAt: null,
          pullIntervalSeconds: null,
        },
        ratioAlert: { fired: ratioFired, level: nextLevel },
        forecastAlert: { fired: false },
      };
    },
  );
}

describe("recordQuotaHeaderSignal — quota_threshold emits supply/model.signal alongside the existing ops alert", () => {
  beforeEach(() => {
    notifyOpsAlert.mockClear();
    emitSupplyEvent.mockClear();
    vi.resetModules();
  });

  it("fires both notifyOpsAlert and supply/model.signal{kind: quota_threshold} when a header crosses the 80% rung", async () => {
    const applyQuotaObservationMock = fakeApplyQuotaObservation({
      used: 0,
      limit: 100,
      lastAlertLevel: "NONE",
    });
    vi.doMock("@nebutra/repositories", () => ({
      RouterSupplyRepository: class {
        applyQuotaObservation = applyQuotaObservationMock;
      },
    }));

    const { recordQuotaHeaderSignal } = await import("./quota");

    await recordQuotaHeaderSignal({
      sourceKey: "goat-account",
      status: 200,
      headers: new Headers({
        "x-ratelimit-limit-requests": "100",
        "x-ratelimit-remaining-requests": "10",
      }),
    });

    expect(loggerError).not.toHaveBeenCalled();
    expect(notifyOpsAlert).toHaveBeenCalledTimes(1);
    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/model.signal", {
      sourceKey: "goat-account",
      kind: "quota_threshold",
      reason: "WARN_80",
    });
  });

  it("does not fire again for a second observation that stays in the same rung (dedupe)", async () => {
    const applyQuotaObservationMock = fakeApplyQuotaObservation({
      used: 0,
      limit: 100,
      lastAlertLevel: "WARN_80",
    });
    vi.doMock("@nebutra/repositories", () => ({
      RouterSupplyRepository: class {
        applyQuotaObservation = applyQuotaObservationMock;
      },
    }));

    const { recordQuotaHeaderSignal } = await import("./quota");

    await recordQuotaHeaderSignal({
      sourceKey: "goat-account",
      status: 200,
      headers: new Headers({
        "x-ratelimit-limit-requests": "100",
        "x-ratelimit-remaining-requests": "12",
      }),
    });

    expect(emitSupplyEvent).not.toHaveBeenCalled();
    expect(notifyOpsAlert).not.toHaveBeenCalled();
  });
});

describe("sanity — the real decision functions this test's fake relies on", () => {
  it("ratioAlertLevel/shouldAlertRatio agree that 90% is a new WARN_80 escalation from NONE", () => {
    expect(ratioAlertLevel(90, 100)).toBe("WARN_80");
    expect(shouldAlertRatio("NONE", "WARN_80")).toBe(true);
    expect(shouldAlertRatio("WARN_80", "WARN_80")).toBe(false);
  });

  it("applyQuotaObservation (HEADER source of truth) replaces used with the provider's own reading", () => {
    const before = {
      unit: "REQUESTS",
      limit: null,
      used: 0,
      resetsAt: null,
      windowSeconds: null,
      sourceOfTruth: "HEADER",
      state: "NOMINAL",
      burnRatePerHour: null,
      forecastExhaustAt: null,
      lastAlertLevel: "NONE",
      lastForecastAlertAt: null,
      lastSampleAt: null,
    } as never;
    const { snapshot } = applyQuotaObservation(
      before,
      { used: 90, limit: 100, sourceOfTruth: "header" } as never,
      new Date(),
    );
    expect(snapshot.used).toBe(90);
    expect(snapshot.limit).toBe(100);
  });
});

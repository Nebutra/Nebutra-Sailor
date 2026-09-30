/**
 * `RouterSupplyRepository`'s quota layer (ADR 2026-09-30 addendum) against a
 * real Prisma client, over PGlite — same posture as
 * `router-supply.repository.test.ts`.
 */
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import {
  applyQuotaObservation,
  forecastWithinHours,
  nextPullDelaySeconds,
  ratioAlertLevel,
  shouldAlertForecast,
  shouldAlertRatio,
} from "@nebutra/router-supply";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RouterSupplyRepository } from "../router-supply.repository";
import { SUPPLY_DDL } from "./supply-schema";

const decide = {
  ratioAlertLevel,
  shouldAlertRatio,
  forecastWithinHours,
  shouldAlertForecast,
  nextPullDelaySeconds,
};

describe("RouterSupplyRepository — quota layer (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;
  let repository: RouterSupplyRepository;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(SUPPLY_DDL);
    repository = new RouterSupplyRepository(database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.prisma.$executeRawUnsafe(
      "TRUNCATE supply_probe_events, supply_quota_samples, supply_quota_windows, supply_source_models, supply_sources CASCADE",
    );
  });

  async function makeSource(key = "goat") {
    return repository.upsertSource({
      key,
      kind: "OPENAI_COMPATIBLE",
      label: "Command Code GOAT",
      baseUrl: "http://x",
    });
  }

  it("ensureQuotaWindowsFromPlan creates one row per declared window and is idempotent on re-run", async () => {
    const source = await makeSource();
    const plan = [
      { name: "5h", unit: "USD", limitAmount: 14, windowSeconds: 5 * 3600 },
      { name: "7d", unit: "USD", limitAmount: 35, windowSeconds: 7 * 86400 },
      { name: "30d", unit: "USD", limitAmount: 70, windowSeconds: 30 * 86400 },
    ];
    await repository.ensureQuotaWindowsFromPlan(source.id, plan);
    let windows = await repository.listQuotaWindows({ sourceId: source.id });
    expect(windows.map((w) => w.name).sort()).toEqual(["30d", "5h", "7d"]);
    expect(windows.every((w) => w.sourceOfTruth === "SELF_METERED")).toBe(true);
    expect(windows.find((w) => w.name === "5h")?.limitAmount).toBe(14);

    // Re-running with an edited limit updates the declared shape, not the counters.
    await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 3, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
    );
    await repository.ensureQuotaWindowsFromPlan(source.id, [
      { name: "5h", unit: "USD", limitAmount: 20, windowSeconds: 5 * 3600 },
    ]);
    windows = await repository.listQuotaWindows({ sourceId: source.id });
    const fiveHour = windows.find((w) => w.name === "5h");
    expect(fiveHour?.limitAmount).toBe(20);
    expect(fiveHour?.usedAmount).toBe(3); // counters survive a plan edit
  });

  it("self-metering accumulates and crosses THROTTLED at 80%, EXHAUSTED at 100%, with dedupe", async () => {
    const source = await makeSource();
    await repository.ensureQuotaWindowsFromPlan(source.id, [
      { name: "5h", unit: "USD", limitAmount: 14, windowSeconds: 5 * 3600 },
    ]);

    const now = new Date("2026-09-30T01:00:00Z");
    const first = await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 5, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      now,
    );
    expect(first?.window.state).toBe("NOMINAL");
    expect(first?.ratioAlert.fired).toBe(false);

    const now2 = new Date("2026-09-30T02:00:00Z");
    const second = await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 7, sourceOfTruth: "SELF_METERED" }, // 12/14 = 85.7%
      applyQuotaObservation,
      decide,
      now2,
    );
    expect(second?.window.state).toBe("THROTTLED");
    expect(second?.ratioAlert).toEqual({ fired: true, level: "WARN_80" });

    // A second apply that stays in the same rung never re-fires (dedupe).
    const now3 = new Date("2026-09-30T02:30:00Z");
    const third = await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 0.1, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      now3,
    );
    expect(third?.ratioAlert.fired).toBe(false);

    // Crossing into EXHAUSTED re-fires at the new rung.
    const now4 = new Date("2026-09-30T03:00:00Z");
    const fourth = await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 5, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      now4,
    );
    expect(fourth?.window.state).toBe("EXHAUSTED");
    expect(fourth?.ratioAlert).toEqual({ fired: true, level: "EXHAUSTED" });

    const windows = await repository.listQuotaWindows({ sourceId: source.id });
    expect(windows[0]?.lastAlertLevel).toBe("EXHAUSTED");
  });

  it("recovers at reset and re-fires from WARN_80 on the next cycle's climb (dedupe resets on rollover)", async () => {
    const source = await makeSource();
    await repository.ensureQuotaWindowsFromPlan(source.id, [
      { name: "5h", unit: "USD", limitAmount: 14, windowSeconds: 5 * 3600 },
    ]);
    const t0 = new Date("2026-09-30T00:00:00Z");
    await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 14, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      t0,
    );
    let [window] = await repository.listQuotaWindows({ sourceId: source.id });
    expect(window.state).toBe("EXHAUSTED");
    expect(window.lastAlertLevel).toBe("EXHAUSTED");
    expect(window.resetsAt).not.toBeNull();
    const resetsAt = window.resetsAt as Date;

    // Well past the reset — a zero-delta tick (the adaptive scheduler's own
    // idle tick) still rolls the window over and recovers it automatically.
    const afterReset = new Date(resetsAt.getTime() + 60_000);
    const recovered = await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 0, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      afterReset,
    );
    expect(recovered?.window.state).toBe("NOMINAL");
    expect(recovered?.window.usedAmount).toBe(0);
    expect(recovered?.window.lastAlertLevel).toBe("NONE");

    // Climbing again in the new cycle re-fires WARN_80 — it was not
    // permanently suppressed by the previous cycle's EXHAUSTED alert.
    const climbing = await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 12, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      new Date(afterReset.getTime() + 3600_000),
    );
    expect(climbing?.ratioAlert).toEqual({ fired: true, level: "WARN_80" });
    [window] = await repository.listQuotaWindows({ sourceId: source.id });
    void window;
  });

  it("a header/endpoint observation creates a window on first sight and replaces (not accumulates) used on later reads", async () => {
    const source = await makeSource("plain-relay");
    const now = new Date("2026-09-30T01:00:00Z");
    const first = await repository.applyQuotaObservation(
      source.key,
      "requests",
      { remaining: 100, limit: 100, sourceOfTruth: "HEADER", unit: "REQUESTS" },
      applyQuotaObservation,
      decide,
      now,
    );
    expect(first?.window.usedAmount).toBe(0);
    expect(first?.window.sourceOfTruth).toBe("HEADER");

    const later = await repository.applyQuotaObservation(
      source.key,
      "requests",
      { remaining: 5, limit: 100, sourceOfTruth: "HEADER" },
      applyQuotaObservation,
      decide,
      new Date(now.getTime() + 60_000),
    );
    expect(later?.window.usedAmount).toBe(95); // replaced, not 0 + 95 + previous
  });

  it("a header-less 429 forces EXHAUSTED via forceExhaustedUntil and auto-recovers after", async () => {
    const source = await makeSource("plain-relay-2");
    const until = new Date("2026-09-30T01:05:00Z");
    const now = new Date("2026-09-30T01:00:00Z");
    const forced = await repository.applyQuotaObservation(
      source.key,
      "rate_limit_429",
      { sourceOfTruth: "HEADER", forceExhaustedUntil: until, unit: "REQUESTS" },
      applyQuotaObservation,
      decide,
      now,
    );
    expect(forced?.window.state).toBe("EXHAUSTED");

    const after = await repository.applyQuotaObservation(
      source.key,
      "rate_limit_429",
      { sourceOfTruth: "HEADER" },
      applyQuotaObservation,
      decide,
      new Date(until.getTime() + 1000),
    );
    expect(after?.window.state).toBe("NOMINAL");
  });

  it("returns null for an unknown source key", async () => {
    const result = await repository.applyQuotaObservation(
      "does-not-exist",
      "5h",
      { deltaUsed: 1, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
    );
    expect(result).toBeNull();
  });

  it("availabilityFor reports headroom=throttled only when every sellable source for the model is throttled/exhausted", async () => {
    const throttledSource = await makeSource("throttled-source");
    const okSource = await makeSource("ok-source");
    await repository.applyDiscovery(throttledSource.id, [{ id: "shared-model", modality: "TEXT" }]);
    await repository.applyDiscovery(okSource.id, [{ id: "shared-model", modality: "TEXT" }]);
    const throttledRow = (await repository.listCapabilities({ sourceId: throttledSource.id }))[0];
    const okRow = (await repository.listCapabilities({ sourceId: okSource.id }))[0];
    // Both AVAILABLE (a success probe each) so both are sellable.
    await repository.recordProbe(
      { sourceModelId: throttledRow.id, kind: "ACTIVE_PROBE", outcome: "success" },
      (c, _o, _r, _n) => ({
        state: "AVAILABLE",
        stateReason: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
        backoffSeconds: 0,
        nextProbeAt: null,
        transitioned: c.state !== "AVAILABLE",
      }),
    );
    await repository.recordProbe(
      { sourceModelId: okRow.id, kind: "ACTIVE_PROBE", outcome: "success" },
      (c, _o, _r, _n) => ({
        state: "AVAILABLE",
        stateReason: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
        backoffSeconds: 0,
        nextProbeAt: null,
        transitioned: c.state !== "AVAILABLE",
      }),
    );

    // throttledSource has an exhausted window; okSource has none.
    await repository.ensureQuotaWindowsFromPlan(throttledSource.id, [
      { name: "5h", unit: "USD", limitAmount: 10, windowSeconds: 18000 },
    ]);
    await repository.applyQuotaObservation(
      throttledSource.key,
      "5h",
      { deltaUsed: 10, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
    );

    const availability = await repository.availabilityFor(["shared-model"]);
    expect(availability.get("shared-model")?.sellable).toBe(true);
    expect(availability.get("shared-model")?.headroom).toBe("ok"); // okSource still has headroom

    // Now exhaust the only other source too — headroom should read "throttled".
    await database.prisma.supplySourceModel.update({
      where: { id: okRow.id },
      data: { state: "SUSPENDED" },
    });
    const stillAvailability = await repository.availabilityFor(["shared-model"]);
    expect(stillAvailability.get("shared-model")?.sellable).toBe(true); // throttled source is still sellable
    expect(stillAvailability.get("shared-model")?.headroom).toBe("throttled");
  });

  it("listQuotaWindowsDueForPull only returns windows whose nextPullAt has elapsed", async () => {
    const source = await makeSource();
    await repository.ensureQuotaWindowsFromPlan(source.id, [
      { name: "5h", unit: "USD", limitAmount: 14, windowSeconds: 18000 },
    ]);
    const now = new Date("2026-09-30T01:00:00Z");
    await repository.applyQuotaObservation(
      source.key,
      "5h",
      { deltaUsed: 1, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservation,
      decide,
      now,
    );
    const dueNow = await repository.listQuotaWindowsDueForPull(now);
    expect(dueNow).toHaveLength(0); // idle window, pulled 60 min out

    const dueLater = await repository.listQuotaWindowsDueForPull(
      new Date(now.getTime() + 61 * 60_000),
    );
    expect(dueLater.map((w) => w.name)).toContain("5h");
  });
});

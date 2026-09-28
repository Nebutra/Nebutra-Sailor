import { afterEach, describe, expect, it } from "vitest";
import { claimProbeSample, loadServiceHistory, recordProbeHistory, windowUptime } from "./history";
import { dayState, dayUptime, mergeDayState } from "./math";
import { getStatusKv } from "./store";

afterEach(async () => {
  await getStatusKv().clear?.();
});

describe("mergeDayState", () => {
  it("keeps the worse status for the calendar day", () => {
    expect(mergeDayState("operational", "degraded")).toBe("degraded");
    expect(mergeDayState("outage", "degraded")).toBe("outage");
  });
});

describe("dayState", () => {
  it("does not colour a day for one blip among many checks", () => {
    expect(dayState({ total: 288, degraded: 1, outage: 0 })).toBe("operational");
  });
  it("colours sustained degradation and outages", () => {
    expect(dayState({ total: 100, degraded: 3, outage: 0 })).toBe("degraded");
    expect(dayState({ total: 100, degraded: 0, outage: 6 })).toBe("outage");
  });
});

describe("recordProbeHistory", () => {
  it("counts checks per day and derives uptime from the ratio", async () => {
    const day = new Date("2026-07-31T10:00:00.000Z");
    await recordProbeHistory([{ id: "api", state: "operational" }], day);
    await recordProbeHistory([{ id: "api", state: "outage" }], day);
    await recordProbeHistory([{ id: "api", state: "operational" }], day);
    await recordProbeHistory([{ id: "api", state: "operational" }], day);

    const history = await loadServiceHistory("api");
    const stats = history.days["2026-07-31"];
    expect(stats).toEqual({ total: 4, degraded: 0, outage: 1 });
    expect(stats && dayUptime(stats)).toBe(0.75);
    expect(windowUptime(history, ["2026-07-30", "2026-07-31"])).toBe(0.75);
  });

  it("shows legacy worst-of-day entries but leaves them out of uptime", async () => {
    await getStatusKv().hset("status:uptime:v1:api", "2026-07-01", "degraded");
    const history = await loadServiceHistory("api");
    expect(history.legacy["2026-07-01"]).toBe("degraded");
    // Colour only: a worst-of-day reading says nothing about how long it lasted.
    expect(windowUptime(history, ["2026-07-01"])).toBeNull();
  });
});

describe("claimProbeSample", () => {
  it("lets one run record per sample window", async () => {
    expect(await claimProbeSample()).toBe(true);
    expect(await claimProbeSample()).toBe(false);
  });
});

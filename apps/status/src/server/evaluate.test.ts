import { describe, expect, it } from "vitest";
import {
  dayState,
  dayUptime,
  type EvidenceReading,
  evaluateComponent,
  judgeEvidence,
  overallState,
} from "./evaluate";

const now = new Date("2026-10-16T12:00:00.000Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

function reading(overrides: Partial<EvidenceReading> = {}): EvidenceReading {
  return {
    source: "monitor:a",
    coverage: "dependency",
    state: "operational",
    checkedAt: ago(30),
    lastSuccessAt: ago(30),
    latencyMs: 120,
    note: null,
    freshnessSeconds: 120,
    ...overrides,
  };
}

describe("judgeEvidence", () => {
  it("keeps a fresh reading as it is", () => {
    expect(judgeEvidence(reading(), now)).toMatchObject({
      effectiveState: "operational",
      stale: false,
    });
  });

  it("reads a reading past its window as degraded, past twice the window as outage", () => {
    expect(judgeEvidence(reading({ checkedAt: ago(200) }), now)).toMatchObject({
      effectiveState: "degraded",
      stale: true,
    });
    expect(judgeEvidence(reading({ checkedAt: ago(241) }), now)).toMatchObject({
      effectiveState: "outage",
      stale: true,
    });
  });

  it("never improves a failing reading because it is stale", () => {
    expect(
      judgeEvidence(reading({ state: "outage", checkedAt: ago(200) }), now).effectiveState,
    ).toBe("outage");
  });
});

describe("evaluateComponent", () => {
  it("is unknown with no evidence", () => {
    expect(evaluateComponent([], [], now).state).toBe("unknown");
  });

  it("takes the worst evidence", () => {
    const verdict = evaluateComponent(
      [reading(), reading({ source: "push:journey", state: "degraded", note: "slow login" })],
      [],
      now,
    );
    expect(verdict.state).toBe("degraded");
    expect(verdict.note).toBe("slow login");
  });

  it("names the silent source when evidence goes stale", () => {
    const verdict = evaluateComponent(
      [reading({ source: "push:journey", checkedAt: ago(500) })],
      [],
      now,
    );
    expect(verdict.state).toBe("outage");
    expect(verdict.note).toBe("No fresh reading from push:journey");
  });

  it("lets a declared incident make things worse, never better", () => {
    expect(
      evaluateComponent(
        [reading()],
        [{ kind: "incident", impact: "critical", inProgress: true }],
        now,
      ).state,
    ).toBe("outage");
    expect(
      evaluateComponent(
        [reading({ state: "outage" })],
        [{ kind: "incident", impact: "minor", inProgress: true }],
        now,
      ).state,
    ).toBe("outage");
  });

  it("shows maintenance in progress, but not over an outage", () => {
    const maintenance = [
      { kind: "maintenance" as const, impact: "none" as const, inProgress: true },
    ];
    expect(evaluateComponent([reading({ state: "degraded" })], maintenance, now).state).toBe(
      "maintenance",
    );
    expect(evaluateComponent([reading({ state: "outage" })], maintenance, now).state).toBe(
      "outage",
    );
    expect(
      evaluateComponent(
        [reading()],
        [{ kind: "maintenance", impact: "none", inProgress: false }],
        now,
      ).state,
    ).toBe("operational");
  });

  it("is verified only by fresh, passing synthetic evidence", () => {
    expect(evaluateComponent([reading()], [], now).verified).toBe(false);
    expect(evaluateComponent([reading({ coverage: "synthetic" })], [], now).verified).toBe(true);
    expect(
      evaluateComponent([reading({ coverage: "synthetic", checkedAt: ago(130) })], [], now)
        .verified,
    ).toBe(false);
  });
});

describe("page and day rollups", () => {
  it("counts unknown as degraded and maintenance as fine", () => {
    expect(overallState(["operational", "maintenance"])).toBe("operational");
    expect(overallState(["operational", "unknown"])).toBe("degraded");
    expect(overallState(["degraded", "outage"])).toBe("outage");
  });

  it("colours a day from its ratio, not its worst reading", () => {
    expect(dayState({ total: 0, degraded: 0, outage: 0 })).toBe("no_data");
    expect(dayState({ total: 1440, degraded: 1, outage: 0 })).toBe("operational");
    expect(dayState({ total: 1440, degraded: 20, outage: 0 })).toBe("degraded");
    expect(dayState({ total: 1440, degraded: 0, outage: 100 })).toBe("outage");
    expect(dayUptime({ total: 100, degraded: 10, outage: 5 })).toBeCloseTo(0.92);
  });
});

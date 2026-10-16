import { describe, expect, it } from "vitest";
import {
  dayState,
  dayUptime,
  type EvidenceReading,
  evaluateComponent,
  evidenceLine,
  judgeEvidence,
  overallState,
  pageVerdict,
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

  it("reads a silent source as unknown, keeping what it last said", () => {
    expect(judgeEvidence(reading({ checkedAt: ago(200) }), now)).toMatchObject({
      effectiveState: "unknown",
      lastState: "operational",
      stale: true,
      ageSeconds: 200,
    });
    expect(judgeEvidence(reading({ checkedAt: ago(1000) }), now).effectiveState).toBe("unknown");
  });

  it("does not turn a silent failing source into a fresh failure either", () => {
    expect(judgeEvidence(reading({ state: "outage", checkedAt: ago(200) }), now)).toMatchObject({
      effectiveState: "unknown",
      lastState: "outage",
    });
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

  it("is unknown, not red, when every source is silent", () => {
    const verdict = evaluateComponent(
      [reading({ source: "push:journey", checkedAt: ago(500) })],
      [],
      now,
    );
    expect(verdict).toMatchObject({ state: "unknown", hasFreshData: false, verified: false });
    expect(verdict.note).toBe("No fresh reading from push:journey");
  });

  it("judges by the fresh sources and names the silent one", () => {
    const verdict = evaluateComponent(
      [reading(), reading({ source: "push:journey", state: "outage", checkedAt: ago(500) })],
      [],
      now,
    );
    expect(verdict).toMatchObject({ state: "operational", hasFreshData: true });
    expect(verdict.evidence).toHaveLength(2);
    expect(verdict.note).toBe("No fresh reading from push:journey");
  });

  it("lets a fresh failure win over a silent source", () => {
    const verdict = evaluateComponent(
      [
        reading({ state: "outage", note: "502 from origin" }),
        reading({ source: "push:journey", checkedAt: ago(500) }),
      ],
      [],
      now,
    );
    expect(verdict.state).toBe("outage");
    expect(verdict.note).toBe("502 from origin");
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
  it("counts unknown and maintenance as fine, and reports components without fresh data", () => {
    expect(overallState(["operational", "maintenance"])).toBe("operational");
    expect(overallState(["operational", "unknown"])).toBe("operational");
    expect(overallState(["unknown", "degraded"])).toBe("degraded");
    expect(overallState(["degraded", "outage"])).toBe("outage");
    const stale = evaluateComponent([reading({ checkedAt: ago(500) })], [], now);
    const none = evaluateComponent([], [], now);
    const fresh = evaluateComponent([reading()], [], now);
    expect(pageVerdict([stale, none, fresh])).toEqual({ overall: "operational", noFreshData: 2 });
  });

  it("lets a declared incident redden a silent component", () => {
    const stale = evaluateComponent(
      [reading({ checkedAt: ago(500) })],
      [{ kind: "incident", impact: "critical", inProgress: true }],
      now,
    );
    expect(stale.state).toBe("outage");
  });

  it("colours a day from its ratio, not its worst reading", () => {
    expect(dayState({ total: 0, degraded: 0, outage: 0 })).toBe("no_data");
    expect(dayState({ total: 1440, degraded: 1, outage: 0 })).toBe("operational");
    expect(dayState({ total: 1440, degraded: 20, outage: 0 })).toBe("degraded");
    expect(dayState({ total: 1440, degraded: 0, outage: 100 })).toBe("outage");
    expect(dayUptime({ total: 100, degraded: 10, outage: 5 })).toBeCloseTo(0.92);
  });
});

describe("evidenceLine", () => {
  it("prefers the deepest fresh proof, then the newest, and lists silent sources longest first", () => {
    const evidence = [
      reading({ source: "monitor:a", coverage: "dependency", checkedAt: ago(5) }),
      reading({ source: "fleet", coverage: "device", checkedAt: ago(60) }),
      reading({ source: "journey-old", coverage: "synthetic", checkedAt: ago(100) }),
      reading({ source: "journey-new", coverage: "synthetic", checkedAt: ago(10), latencyMs: 300 }),
      reading({ source: "gone", coverage: "synthetic", checkedAt: ago(5000), state: "outage" }),
      reading({ source: "quiet", coverage: "upstream", checkedAt: ago(700) }),
    ].map((r) => judgeEvidence(r, now));
    const line = evidenceLine(evidence);
    expect(line.primary).toEqual({
      source: "journey-new",
      coverage: "synthetic",
      state: "operational",
      checkedAt: ago(10),
      latencyMs: 300,
    });
    expect(line.stale).toEqual([
      {
        source: "gone",
        coverage: "synthetic",
        lastState: "outage",
        checkedAt: ago(5000),
        ageSeconds: 5000,
      },
      {
        source: "quiet",
        coverage: "upstream",
        lastState: "operational",
        checkedAt: ago(700),
        ageSeconds: 700,
      },
    ]);
  });

  it("has no primary when every source is silent", () => {
    const line = evidenceLine([judgeEvidence(reading({ checkedAt: ago(500) }), now)]);
    expect(line.primary).toBeNull();
    expect(line.stale).toHaveLength(1);
  });

  it("falls through coverages in order", () => {
    const pick = (coverages: EvidenceReading["coverage"][]) =>
      evidenceLine(
        coverages.map((coverage) => judgeEvidence(reading({ source: coverage, coverage }), now)),
      ).primary?.coverage;
    expect(pick(["manual", "dependency", "upstream", "device"])).toBe("device");
    expect(pick(["manual", "dependency", "upstream"])).toBe("upstream");
    expect(pick(["manual", "dependency"])).toBe("dependency");
    expect(pick(["manual"])).toBe("manual");
  });
});

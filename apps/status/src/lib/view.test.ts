import { describe, expect, it } from "vitest";
import { type EvidenceReading, evaluateComponent } from "@/server/evaluate";
import type { SnapshotComponent, SnapshotDay, SnapshotIncident } from "@/server/snapshot";
import {
  evidenceLine,
  groupComponents,
  incidentsByMonth,
  incidentsOnDay,
  mergeDays,
  monthGrid,
  stepTimes,
  windowMonths,
  worstState,
} from "./view";

const now = new Date("2026-10-16T12:00:00Z");

function reading(over: Partial<EvidenceReading>): EvidenceReading {
  return {
    source: "monitor:1",
    coverage: "dependency",
    state: "operational",
    checkedAt: new Date(now.getTime() - 60_000),
    lastSuccessAt: null,
    latencyMs: 120,
    note: null,
    freshnessSeconds: 300,
    ...over,
  };
}

function day(date: string, over: Partial<SnapshotDay> = {}): SnapshotDay {
  return { date, state: "operational", uptime: 1, total: 10, avgLatencyMs: 100, ...over };
}

function component(key: string, over: Partial<SnapshotComponent> = {}): SnapshotComponent {
  return {
    id: key,
    key,
    name: key,
    nameI18n: null,
    description: null,
    groupKey: null,
    isPublic: true,
    verdict: evaluateComponent([reading({})], [], now),
    days: [day("2026-10-15"), day("2026-10-16")],
    uptime90: 1,
    ...over,
  };
}

function incident(over: Partial<SnapshotIncident>): SnapshotIncident {
  return {
    id: "i1",
    kind: "incident",
    title: "API errors",
    impact: "major",
    status: "resolved",
    phase: null,
    scheduledStart: null,
    scheduledEnd: null,
    resolvedAt: new Date("2026-10-15T03:00:00Z"),
    createdAt: new Date("2026-10-14T22:00:00Z"),
    updatedAt: new Date("2026-10-15T03:00:00Z"),
    componentKeys: ["api"],
    updates: [],
    ...over,
  };
}

describe("worstState", () => {
  it("ranks outage over degraded over maintenance, and no_data lowest", () => {
    expect(worstState(["operational", "degraded", "maintenance"])).toBe("degraded");
    expect(worstState(["no_data", "operational"])).toBe("operational");
    expect(worstState(["no_data"])).toBe("no_data");
    expect(worstState([])).toBe("no_data");
  });
});

describe("mergeDays", () => {
  it("takes the worst state, averages measured uptime and weights latency by readings", () => {
    const merged = mergeDays([
      [day("d", { state: "operational", uptime: 1, total: 30, avgLatencyMs: 100 })],
      [day("d", { state: "degraded", uptime: 0.9, total: 10, avgLatencyMs: 500 })],
      [day("d", { state: "no_data", uptime: null, total: 0, avgLatencyMs: null })],
    ]);
    expect(merged[0]).toEqual({
      date: "d",
      state: "degraded",
      uptime: 0.95,
      total: 40,
      avgLatencyMs: 200,
    });
  });

  it("keeps a day with no readings anywhere as no_data", () => {
    const empty = day("d", { state: "no_data", uptime: null, total: 0, avgLatencyMs: null });
    expect(mergeDays([[empty], [empty]])[0]).toMatchObject({ state: "no_data", uptime: null });
  });
});

describe("groupComponents", () => {
  it("puts ungrouped components first, keeps group order and drops empty groups", () => {
    const groups = [
      { key: "edge", name: "Edge", nameI18n: null },
      { key: "empty", name: "Empty", nameI18n: null },
      { key: "core", name: "Core", nameI18n: null },
    ];
    const view = groupComponents(groups, [
      component("api", { groupKey: "core", uptime90: 0.98 }),
      component("cdn", { groupKey: "edge" }),
      component("docs"),
      component("db", {
        groupKey: "core",
        uptime90: null,
        verdict: evaluateComponent([reading({ state: "outage" })], [], now),
      }),
    ]);
    expect(view.map((g) => g.key)).toEqual([null, "edge", "core"]);
    const core = view[2];
    expect(core?.components.map((c) => c.key)).toEqual(["api", "db"]);
    expect(core?.state).toBe("outage");
    expect(core?.uptime90).toBe(0.98);
  });
});

describe("incidentsOnDay", () => {
  it("covers every UTC day an incident was open, only for its components", () => {
    const list = [incident({}), incident({ id: "m", kind: "maintenance" })];
    expect(incidentsOnDay(list, ["api"], "2026-10-14", now).map((i) => i.id)).toEqual(["i1"]);
    expect(incidentsOnDay(list, ["api"], "2026-10-15", now).map((i) => i.id)).toEqual(["i1"]);
    expect(incidentsOnDay(list, ["api"], "2026-10-16", now)).toEqual([]);
    expect(incidentsOnDay(list, ["web"], "2026-10-14", now)).toEqual([]);
    expect(incidentsOnDay(list, null, "2026-10-14", now)).toHaveLength(1);
  });

  it("runs an open incident through today", () => {
    const open = incident({ status: "investigating", resolvedAt: null });
    expect(incidentsOnDay([open], ["api"], "2026-10-16", now)).toHaveLength(1);
  });
});

describe("evidenceLine", () => {
  it("leads with a verified synthetic journey over a dependency check", () => {
    const verdict = evaluateComponent(
      [
        reading({ coverage: "dependency" }),
        reading({
          source: "journey",
          coverage: "synthetic",
          checkedAt: new Date(now.getTime() - 120_000),
        }),
      ],
      [],
      now,
    );
    expect(evidenceLine(verdict, now)).toMatchObject({
      kind: "synthetic",
      passing: true,
      staleMinutes: null,
    });
  });

  it("reports a failing fresh source as failing", () => {
    const verdict = evaluateComponent([reading({ state: "outage" })], [], now);
    expect(evidenceLine(verdict, now)).toMatchObject({ kind: "dependency", passing: false });
  });

  it("says how long a quiet source has been silent instead of keeping its colour", () => {
    const verdict = evaluateComponent(
      [reading({ checkedAt: new Date(now.getTime() - 23 * 60_000), freshnessSeconds: 300 })],
      [],
      now,
    );
    expect(evidenceLine(verdict, now)).toMatchObject({ kind: "stale", staleMinutes: 23 });
  });

  it("names a stale source even when another one is fresh", () => {
    const verdict = evaluateComponent(
      [
        reading({}),
        reading({
          source: "journey",
          coverage: "synthetic",
          checkedAt: new Date(now.getTime() - 40 * 60_000),
        }),
      ],
      [],
      now,
    );
    expect(evidenceLine(verdict, now)).toMatchObject({ kind: "dependency", staleMinutes: 40 });
  });

  it("admits when there is no evidence at all", () => {
    expect(evidenceLine(evaluateComponent([], [], now), now).kind).toBe("none");
  });
});

describe("stepTimes", () => {
  it("records when each status was first reached and leaves skipped steps empty", () => {
    const t1 = new Date("2026-10-15T01:00:00Z");
    const t2 = new Date("2026-10-15T02:00:00Z");
    const t3 = new Date("2026-10-15T03:00:00Z");
    expect(
      stepTimes([
        { status: "investigating", createdAt: t1 },
        { status: "investigating", createdAt: t2 },
        { status: "resolved", createdAt: t3 },
      ]),
    ).toEqual({ investigating: t1, identified: null, monitoring: null, resolved: t3 });
  });
});

describe("calendar", () => {
  it("lays a month out in Monday-first weeks and marks the measured window", () => {
    const weeks = monthGrid(2026, 9, new Set(["2026-10-15", "2026-10-16"]));
    // October 2026 starts on a Thursday: three leading days.
    expect(weeks[0]?.slice(0, 4).map((d) => d.inMonth)).toEqual([false, false, false, true]);
    expect(weeks[0]?.[3]?.date).toBe("2026-10-01");
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
    expect(
      weeks
        .flat()
        .filter((d) => d.inWindow)
        .map((d) => d.date),
    ).toEqual(["2026-10-15", "2026-10-16"]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("lists the window's months newest first", () => {
    expect(windowMonths(["2026-07-19", "2026-08-01", "2026-09-30", "2026-10-16"])).toEqual([
      [2026, 9],
      [2026, 8],
      [2026, 7],
      [2026, 6],
    ]);
  });

  it("groups incidents by the month they started, newest first", () => {
    const grouped = incidentsByMonth([
      incident({ id: "a", createdAt: new Date("2026-09-03T00:00:00Z") }),
      incident({ id: "b", createdAt: new Date("2026-10-02T00:00:00Z") }),
      incident({ id: "c", createdAt: new Date("2026-10-09T00:00:00Z") }),
    ]);
    expect(grouped.map((g) => [g.month, g.incidents.map((i) => i.id)])).toEqual([
      [9, ["c", "b"]],
      [8, ["a"]],
    ]);
  });
});

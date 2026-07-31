import { afterEach, describe, expect, it } from "vitest";
import {
  createIncident,
  groupIncidentsByDay,
  listActiveIncidents,
  updateIncident,
} from "./status-incidents";
import { type StatusKv, setStatusKvForTests } from "./status-store";

function memoryKv(): StatusKv {
  const map = new Map<string, string>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async hgetall() {
      return {};
    },
    async hset() {},
  };
}

describe("status incidents", () => {
  afterEach(() => {
    setStatusKvForTests(null);
  });

  it("creates and resolves incidents with a timeline", async () => {
    setStatusKvForTests(memoryKv());

    const created = await createIncident(
      {
        title: "API elevated errors",
        impact: "major",
        status: "investigating",
        message: "We are investigating elevated 5xx rates.",
        affectedServiceIds: ["api"],
      },
      new Date("2026-07-31T12:00:00.000Z"),
    );

    expect(created.id).toBeTruthy();
    expect(created.updates).toHaveLength(1);
    expect((await listActiveIncidents()).map((i) => i.id)).toContain(created.id);

    const resolved = await updateIncident(
      {
        id: created.id,
        status: "resolved",
        message: "Traffic has returned to baseline.",
      },
      new Date("2026-07-31T14:00:00.000Z"),
    );

    expect(resolved?.status).toBe("resolved");
    expect(resolved?.resolvedAt).toBe("2026-07-31T14:00:00.000Z");
    expect(resolved?.updates).toHaveLength(2);
    expect(await listActiveIncidents()).toHaveLength(0);

    expect(resolved).not.toBeNull();
    const grouped = groupIncidentsByDay(resolved ? [resolved] : [], ["2026-07-31", "2026-07-30"]);
    expect(grouped["2026-07-31"]).toHaveLength(1);
    expect(grouped["2026-07-30"]).toHaveLength(0);
  });
});

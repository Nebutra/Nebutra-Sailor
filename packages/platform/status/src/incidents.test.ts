import { afterEach, describe, expect, it } from "vitest";
import {
  createIncident,
  getIncident,
  groupIncidentsByDay,
  listActiveIncidents,
  listIncidents,
  updateIncident,
} from "./incidents";
import { getStatusKv } from "./store";

describe("status incidents", () => {
  afterEach(async () => {
    await getStatusKv().clear?.();
  });

  it("creates and resolves incidents with a timeline", async () => {
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

  it("keeps every incident when two are written concurrently", async () => {
    await Promise.all([
      createIncident({ title: "A", message: "a" }),
      createIncident({ title: "B", message: "b" }),
    ]);
    expect((await listIncidents()).map((i) => i.title).sort()).toEqual(["A", "B"]);
  });

  it("skips an unreadable entry without hiding the rest", async () => {
    const kept = await createIncident({ title: "Kept", message: "ok" });
    await getStatusKv().hset("status:incidents:v2", "broken", "{not json");

    const listed = await listIncidents();
    expect(listed.map((i) => i.id)).toEqual([kept.id]);

    await createIncident({ title: "Next", message: "ok" });
    expect(await listIncidents()).toHaveLength(2);
  });

  it("reads and migrates incidents from the v1 blob", async () => {
    const legacy = {
      id: "legacy-1",
      title: "Old outage",
      impact: "major",
      status: "resolved",
      message: "Fixed.",
      affectedServiceIds: ["api"],
      updates: [],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T01:00:00.000Z",
      kind: "incident",
    };
    await getStatusKv().set("status:incidents:v1", JSON.stringify([legacy]));

    expect((await getIncident("legacy-1"))?.title).toBe("Old outage");
    await createIncident({ title: "New", message: "n" });
    expect((await listIncidents()).map((i) => i.id)).toContain("legacy-1");
  });
});

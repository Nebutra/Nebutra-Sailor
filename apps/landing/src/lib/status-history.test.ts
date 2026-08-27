import { afterEach, describe, expect, it } from "vitest";
import { loadServiceHistory, mergeDayState, recordProbeHistory } from "./status-history";
import { setStatusKvForTests } from "./status-store";

function memoryKv() {
  const hashes = new Map<string, Map<string, string>>();
  return {
    async get() {
      return null;
    },
    async set() {},
    async hgetall(key: string) {
      return Object.fromEntries(hashes.get(key)?.entries() ?? []);
    },
    async hset(key: string, field: string, value: string) {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      h.set(field, value);
    },
    async clear() {
      hashes.clear();
    },
  };
}

describe("mergeDayState", () => {
  it("keeps the worse status for the calendar day", () => {
    expect(mergeDayState("operational", "degraded")).toBe("degraded");
    expect(mergeDayState("degraded", "operational")).toBe("degraded");
    expect(mergeDayState("degraded", "outage")).toBe("outage");
    expect(mergeDayState("outage", "degraded")).toBe("outage");
  });
});

describe("recordProbeHistory", () => {
  afterEach(async () => {
    setStatusKvForTests(null);
  });

  it("persists worst-of-day per service", async () => {
    setStatusKvForTests(memoryKv());
    const day = new Date("2026-07-31T10:00:00.000Z");

    await recordProbeHistory([{ id: "api", state: "operational" }], day);
    await recordProbeHistory([{ id: "api", state: "degraded" }], day);
    await recordProbeHistory([{ id: "api", state: "operational" }], day);

    const history = await loadServiceHistory("api");
    expect(history["2026-07-31"]).toBe("degraded");
  });
});

import { describe, expect, it } from "vitest";
import { SessionStore } from "./sessions";

describe("SessionStore", () => {
  it("creates probes under zone and records recursive hits", () => {
    const store = new SessionStore({
      zone: "leak.example.com",
      answerIp: "127.0.0.1",
      defaultTtlSec: 60,
    });
    const s = store.create({ probeCount: 4 });
    expect(s.probeNames).toHaveLength(4);
    expect(s.probeNames[0]).toMatch(/\.s\.leak\.example\.com$/);
    expect(s.ready).toBe(false);

    const name = s.probeNames[0] ?? "";
    const name2 = s.probeNames[1] ?? "";
    expect(name).toBeTruthy();
    expect(name2).toBeTruthy();
    store.recordQuery(name, "8.8.8.8");
    store.recordQuery(name, "8.8.8.8");
    store.recordQuery(name2, "1.1.1.1");

    const got = store.get(s.id);
    expect(got?.ready).toBe(true);
    expect(got?.queryCount).toBe(3);
    expect(got?.resolvers).toHaveLength(2);
    expect(got?.resolvers.find((r) => r.ip === "8.8.8.8")?.count).toBe(2);
  });

  it("ignores queries outside zone", () => {
    const store = new SessionStore({ zone: "leak.example.com", answerIp: "127.0.0.1" });
    const s = store.create({ probeCount: 4 });
    store.recordQuery("evil.com", "9.9.9.9");
    expect(store.get(s.id)?.queryCount).toBe(0);
  });
});

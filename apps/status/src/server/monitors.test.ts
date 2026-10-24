import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyConfig, type StatusConfig } from "./config";
import { claimLease, type MonitorResult, runDueMonitors, runMonitor } from "./monitors";
import { createTestDb, type TestDb } from "./testing";

type Spec = Parameters<typeof runMonitor>[0];

const base: Spec = {
  kind: "http",
  url: "https://probe.test/health",
  method: "GET",
  expectStatusMin: 200,
  expectStatusMax: 399,
  keyword: null,
  timeoutMs: 1000,
};

function respond(body: string | object, status = 200) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, { status, headers: { "content-type": "application/json" } });
}

function stubFetch(...responses: Array<Response | Error>) {
  const fn = vi.fn(async () => {
    const next = responses.length > 1 ? responses.shift() : responses[0];
    if (next instanceof Error) throw next;
    return (next as Response).clone();
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runMonitor", () => {
  it("http: in-range status is operational", async () => {
    stubFetch(respond("ok"));
    const r = await runMonitor(base, "test", 0);
    expect(r).toMatchObject({ state: "operational", statusCode: 200 });
  });

  it("http: 5xx confirmed twice is an outage, 4xx degraded, out-of-range 2xx degraded", async () => {
    const f = stubFetch(respond("x", 503));
    expect((await runMonitor(base, "test", 0)).state).toBe("outage");
    expect(f).toHaveBeenCalledTimes(2);
    stubFetch(respond("x", 404));
    expect((await runMonitor(base, "test", 0)).state).toBe("degraded");
    stubFetch(respond("x", 201));
    expect(
      (await runMonitor({ ...base, expectStatusMin: 200, expectStatusMax: 200 }, "test", 0)).state,
    ).toBe("degraded");
  });

  it("confirm-retry: a single failure followed by success is operational", async () => {
    const f = stubFetch(respond("x", 502), respond("ok"));
    const r = await runMonitor(base, "test", 0);
    expect(r.state).toBe("operational");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("keyword: present vs missing", async () => {
    stubFetch(respond("<html>All systems go</html>"));
    expect(
      (await runMonitor({ ...base, kind: "keyword", keyword: "systems go" }, "t", 0)).state,
    ).toBe("operational");
    stubFetch(respond("<html>maintenance</html>"));
    const r = await runMonitor({ ...base, kind: "keyword", keyword: "systems go" }, "t", 0);
    expect(r).toMatchObject({ state: "degraded", note: "Keyword missing" });
  });

  it("json_status: maps status words and ready booleans", async () => {
    const spec = { ...base, kind: "json_status" as const };
    stubFetch(respond({ status: "ok" }));
    expect((await runMonitor(spec, "t", 0)).state).toBe("operational");
    stubFetch(respond({ status: "degraded" }));
    expect((await runMonitor(spec, "t", 0)).state).toBe("degraded");
    stubFetch(respond({ ready: false }));
    expect((await runMonitor(spec, "t", 0)).state).toBe("outage");
    stubFetch(respond({ hello: "world" }));
    expect((await runMonitor(spec, "t", 0)).state).toBe("unknown");
  });

  it("statuspage: maps the Atlassian indicator", async () => {
    const spec = { ...base, kind: "statuspage" as const };
    const cases: Array<[string, MonitorResult["state"]]> = [
      ["none", "operational"],
      ["minor", "degraded"],
      ["major", "outage"],
      ["critical", "outage"],
      ["maintenance", "maintenance"],
    ];
    for (const [indicator, state] of cases) {
      stubFetch(respond({ status: { indicator, description: `is ${indicator}` } }));
      const r = await runMonitor(spec, "t", 0);
      expect(r.state).toBe(state);
      expect(r.note).toBe(`is ${indicator}`);
    }
  });

  it("timeout reads degraded, a refused connection outage", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    stubFetch(timeout);
    expect(await runMonitor(base, "t", 0)).toMatchObject({
      state: "degraded",
      statusCode: null,
      note: "Timed out after 1000 ms",
    });
    stubFetch(new TypeError("fetch failed"));
    expect(await runMonitor(base, "t", 0)).toMatchObject({ state: "outage", note: "No response" });
  });

  it("aborts a slow response at timeoutMs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ),
    );
    const r = await runMonitor({ ...base, timeoutMs: 100 }, "t", 0);
    expect(r.state).toBe("degraded");
    expect(r.note).toMatch(/Timed out/);
  });
});

const config: StatusConfig = {
  workspace: { slug: "acme", name: "Acme" },
  page: { slug: "acme", title: "Acme" },
  components: [
    {
      key: "api",
      name: "API",
      monitors: [{ url: "https://acme.test/health", intervalSeconds: 60 }],
    },
  ],
};

describe("runDueMonitors and claimLease (PGlite)", () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.db.workspace.deleteMany();
    await t.db.runnerLease.deleteMany();
  });

  it("records evidence as monitor:<id> and advances nextRunAt", async () => {
    await applyConfig(t.db, config);
    const monitor = await t.db.monitor.findFirstOrThrow();
    const run = vi.fn(
      async (): Promise<MonitorResult> => ({
        state: "operational",
        statusCode: 200,
        latencyMs: 42,
        note: "Responding normally",
      }),
    );
    const changes = await runDueMonitors(t.db, { now: new Date(Date.now() + 1000), run });
    expect(run).toHaveBeenCalledTimes(1);
    expect(changes).toEqual([
      {
        componentId: monitor.componentId,
        source: `monitor:${monitor.id}`,
        from: null,
        to: "operational",
      },
    ]);
    const evidence = await t.db.evidence.findFirstOrThrow();
    expect(evidence).toMatchObject({
      source: `monitor:${monitor.id}`,
      coverage: "dependency",
      state: "operational",
      latencyMs: 42,
      freshnessSeconds: 180,
    });
    const after = await t.db.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
    expect(after.nextRunAt.getTime()).toBeGreaterThan(Date.now() + 50_000);

    // Not due any more: a second tick runs nothing.
    await runDueMonitors(t.db, { run });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("skips disabled monitors", async () => {
    await applyConfig(t.db, config);
    await t.db.monitor.updateMany({ data: { enabled: false } });
    const run = vi.fn();
    await runDueMonitors(t.db, { now: new Date(Date.now() + 1000), run });
    expect(run).not.toHaveBeenCalled();
  });

  it("claimLease: a second holder is refused until the lease expires", async () => {
    const now = new Date("2026-10-16T12:00:00Z");
    expect(await claimLease(t.db, "a", 30, now)).toBe(true);
    expect(await claimLease(t.db, "b", 30, new Date(now.getTime() + 10_000))).toBe(false);
    // The holder renews.
    expect(await claimLease(t.db, "a", 30, new Date(now.getTime() + 20_000))).toBe(true);
    // Renewed to +50 s, so b at +45 s is still refused.
    expect(await claimLease(t.db, "b", 30, new Date(now.getTime() + 45_000))).toBe(false);
    expect(await claimLease(t.db, "b", 30, new Date(now.getTime() + 51_000))).toBe(true);
    expect((await t.db.runnerLease.findUniqueOrThrow({ where: { name: "monitors" } })).holder).toBe(
      "b",
    );
  });
});

/**
 * Golden tests for `xiaoya-v1`: the exact bytes 小芽's Go encoder would
 * write, and its release gate (scripts/deploy.sh ~749 and ~799-822)
 * re-expressed from jq in TypeScript, run against the shipped example config.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as rootStatus } from "@/app/api/v1/status/route";
import { GET as compatStatus } from "@/app/compat/xiaoya-v1/[slug]/status.json/route";
import { applyConfig, type StatusConfig } from "../config";
import { setDbForTests } from "../db";
import { pushEvidence } from "../evidence";
import { createIncident } from "../incidents";
import { buildPageSnapshot } from "../snapshot";
import { createTestDb, type TestDb } from "../testing";
import { buildXiaoyaStatus, marshalGo, rfc3339, type XiaoyaStatus } from "./xiaoya-v1";

const example = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../examples/xiaoya.status.config.json"), "utf8"),
) as StatusConfig;

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
  setDbForTests(t.db);
}, 60_000);
afterAll(async () => {
  setDbForTests(null);
  await t.close();
});
beforeEach(async () => {
  await t.db.workspace.deleteMany();
});
afterEach(() => {
  delete process.env.STATUS_COMPAT_ROOT;
  delete process.env.STATUS_DEFAULT_PAGE;
});

/**
 * deploy.sh:749 —
 *   [.components[] | select(.id == "family-contact"
 *     and (.status == "operational" or .status == "degraded"))] | length == 1
 */
function contactGate(status: XiaoyaStatus): boolean {
  return (
    status.components.filter(
      (c) => c.id === "family-contact" && (c.status === "operational" || c.status === "degraded"),
    ).length === 1
  );
}

/**
 * deploy.sh:799-822 —
 *   [.components[] | select(.id == "identity-access" or … "exploration-collections")
 *     | select(.verification.coverage == "synthetic" and .verification.verified == true
 *         and .verification.checked_at >= $started)] | length == 4
 * jq compares strings lexically; so does this.
 */
const CORE = ["identity-access", "family-device", "learning-content", "exploration-collections"];
function coreJourneyGate(status: XiaoyaStatus, started: string): boolean {
  return (
    status.components
      .filter((c) => CORE.includes(c.id))
      .filter(
        (c) =>
          c.verification?.coverage === "synthetic" &&
          c.verification.verified === true &&
          (c.verification.checked_at ?? "") >= started,
      ).length === 4
  );
}

async function journey(pageId: string, component: string, at: Date, state = "operational") {
  const result = await pushEvidence(
    t.db,
    pageId,
    {
      component,
      source: "business-probe",
      coverage: "synthetic",
      state: state as "operational",
      checkedAt: at.toISOString(),
      latencyMs: 180,
      freshnessSeconds: 900,
    },
    at,
  );
  expect(result).not.toHaveProperty("error");
}

describe("xiaoya-v1 release gate", () => {
  it("passes once all four journeys report after the release started", async () => {
    const { page } = await applyConfig(t.db, example);
    const started = new Date("2026-10-16T08:00:00.000Z");
    const startedText = "2026-10-16T08:00:00Z"; // date -u +%Y-%m-%dT%H:%M:%SZ

    // A journey from before the release does not count.
    for (const c of CORE) await journey(page.id, c, new Date(started.getTime() - 30_000));
    await pushEvidence(
      t.db,
      page.id,
      {
        component: "family-contact",
        source: "dependency-rollup",
        coverage: "dependency",
        state: "operational",
        freshnessSeconds: 180,
      },
      started,
    );
    let snap = await buildPageSnapshot(t.db, { slug: "xiaoya" }, { now: started });
    let body = buildXiaoyaStatus(snap!, "https://zk.mox.ktvsky.com/status");
    expect(contactGate(body)).toBe(true);
    expect(coreJourneyGate(body, startedText)).toBe(false);

    // Same second as the start, with milliseconds: Go truncates, so it passes.
    const after = new Date(started.getTime() + 400);
    for (const c of CORE) await journey(page.id, c, after);
    snap = await buildPageSnapshot(
      t.db,
      { slug: "xiaoya" },
      { now: new Date(after.getTime() + 1000) },
    );
    body = buildXiaoyaStatus(snap!, "https://zk.mox.ktvsky.com/status");
    expect(coreJourneyGate(body, startedText)).toBe(true);
    const identity = body.components.find((c) => c.id === "identity-access");
    expect(identity?.verification).toEqual({
      coverage: "synthetic",
      verified: true,
      status: "operational",
      checked_at: "2026-10-16T08:00:00Z",
      last_success_at: "2026-10-16T08:00:00Z",
      latency_ms: 180,
    });

    // A failing journey fails the gate even though it is fresh.
    await journey(page.id, "family-device", new Date(after.getTime() + 2000), "outage");
    snap = await buildPageSnapshot(
      t.db,
      { slug: "xiaoya" },
      { now: new Date(after.getTime() + 3000) },
    );
    body = buildXiaoyaStatus(snap!, "https://zk.mox.ktvsky.com/status");
    expect(coreJourneyGate(body, startedText)).toBe(false);
    expect(body.components.find((c) => c.id === "family-device")?.verification).toMatchObject({
      verified: false,
      status: "outage",
      last_success_at: "2026-10-16T08:00:00Z",
    });
    expect(body.overall).toBe("outage");
  });

  it("goes stale like ApplyBusinessProbeEvidence: past freshness degraded, past 2x outage", async () => {
    const { page } = await applyConfig(t.db, example);
    const at = new Date("2026-10-16T08:00:00Z");
    await journey(page.id, "identity-access", at);
    const read = async (seconds: number) => {
      const snap = await buildPageSnapshot(
        t.db,
        { slug: "xiaoya" },
        {
          now: new Date(at.getTime() + seconds * 1000),
        },
      );
      return buildXiaoyaStatus(snap!, "u").components.find((c) => c.id === "identity-access");
    };
    expect((await read(600))?.verification?.verified).toBe(true);
    expect((await read(1000))?.verification).toMatchObject({ verified: false, status: "degraded" });
    expect((await read(1900))?.status).toBe("outage");
  });

  it("shapes the document like PublicStatusResp", async () => {
    await applyConfig(t.db, example);
    const now = new Date("2026-10-16T08:00:00.123Z");
    const snap = await buildPageSnapshot(t.db, { slug: "xiaoya" }, { now });
    const body = buildXiaoyaStatus(snap!, "https://zk.mox.ktvsky.com/status");
    expect(Object.keys(body)).toEqual([
      "page",
      "overall",
      "components",
      "groups",
      "incidents",
      "updated_at",
    ]);
    expect(body.page).toEqual({
      name: "小芽服务状态",
      url: "https://zk.mox.ktvsky.com/status",
      description: "小芽当前产品服务、访问入口与平台基础设施的实时可用性。",
    });
    // notification-delivery is internal; the external group has no components yet.
    expect(body.components).toHaveLength(16);
    expect(body.components.some((c) => c.id === "notification-delivery")).toBe(false);
    expect(body.groups.map((g) => g.id)).toEqual(["product", "delivery", "platform"]);
    expect(body.groups.map((g) => g.components.length)).toEqual([9, 3, 4]);
    // No evidence yet: unknown renders degraded, verification dependency_only.
    expect(body.components[0]).toEqual({
      id: "identity-access",
      name: "登录与账号",
      description: "账号登录、注册、会话与微信授权入口。",
      status: "degraded",
      updated_at: "2026-10-16T08:00:00Z",
      verification: { coverage: "dependency_only", verified: false },
    });
    expect(body.incidents).toEqual([]);
    expect(body.updated_at).toBe("2026-10-16T08:00:00Z");
  });
});

describe("xiaoya-v1 bytes", () => {
  it("matches Go's json.Marshal output exactly", async () => {
    const config: StatusConfig = {
      workspace: { slug: "x", name: "X" },
      page: { slug: "x", title: "A <b> & c", compatProfile: "xiaoya-v1" },
      groups: [{ key: "product", name: "产品", description: "d" }],
      components: [
        { key: "login", name: "登录", group: "product" },
        { key: "db", name: "DB" },
      ],
    };
    const { page } = await applyConfig(t.db, config);
    const at = new Date("2026-10-16T08:00:05.999Z");
    await journey(page.id, "login", at);
    await pushEvidence(
      t.db,
      page.id,
      {
        component: "db",
        source: "ping",
        coverage: "dependency",
        state: "operational",
        latencyMs: 0,
        freshnessSeconds: 60,
      },
      at,
    );
    await createIncident(
      t.db,
      page,
      { title: "Slow", impact: "minor", message: "Looking into it", components: ["login"] },
      at,
    );
    const snap = await buildPageSnapshot(t.db, { slug: "x" }, { now: at });
    const bytes = marshalGo(buildXiaoyaStatus(snap!, "https://x.test/status"));
    const incidentId = snap!.activeIncidents[0]!.id;
    expect(bytes).toBe(
      `{"page":{"name":"A \\u003cb\\u003e \\u0026 c","url":"https://x.test/status","description":""},` +
        `"overall":"degraded",` +
        `"components":[` +
        `{"id":"login","name":"登录","description":"","status":"degraded","latency_ms":180,"updated_at":"2026-10-16T08:00:05Z",` +
        `"verification":{"coverage":"synthetic","verified":true,"status":"operational","checked_at":"2026-10-16T08:00:05Z","last_success_at":"2026-10-16T08:00:05Z","latency_ms":180}},` +
        `{"id":"db","name":"DB","description":"","status":"operational","updated_at":"2026-10-16T08:00:05Z","verification":{"coverage":"dependency_only","verified":false}}],` +
        `"groups":[{"id":"product","name":"产品","description":"d","components":[` +
        `{"id":"login","name":"登录","description":"","status":"degraded","latency_ms":180,"updated_at":"2026-10-16T08:00:05Z",` +
        `"verification":{"coverage":"synthetic","verified":true,"status":"operational","checked_at":"2026-10-16T08:00:05Z","last_success_at":"2026-10-16T08:00:05Z","latency_ms":180}}]}],` +
        `"incidents":[{"id":"${incidentId}","title":"Slow","status":"investigating","impact":"degraded","updated_at":"2026-10-16T08:00:05Z","message":"Looking\\u2028into it"}],` +
        `"updated_at":"2026-10-16T08:00:05Z"}`,
    );
  });

  it("formats like time.RFC3339 on UTC", () => {
    expect(rfc3339(new Date("2026-01-02T03:04:05.999Z"))).toBe("2026-01-02T03:04:05Z");
  });
});

describe("xiaoya-v1 routes", () => {
  it("serves /compat/xiaoya-v1/<slug>/status.json and, when enabled, /api/v1/status", async () => {
    await applyConfig(t.db, example);
    const req = new Request("https://zk.mox.ktvsky.com/api/v1/status");
    const res = await compatStatus(req, { params: Promise.resolve({ slug: "xiaoya" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect((await res.json()).page.name).toBe("小芽服务状态");

    expect((await rootStatus(req)).status).toBe(404);
    process.env.STATUS_COMPAT_ROOT = "xiaoya-v1";
    process.env.STATUS_DEFAULT_PAGE = "xiaoya";
    const root = await rootStatus(req);
    expect(root.status).toBe(200);
    expect((await root.json()).components).toHaveLength(16);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyConfig, type StatusConfig } from "./config";
import { pushEvidence, recordEvidence } from "./evidence";
import { createIncident, updateIncident } from "./incidents";
import { buildPageSnapshot } from "./snapshot";
import { createTestDb, type TestDb } from "./testing";

const config: StatusConfig = {
  workspace: { slug: "acme", name: "Acme" },
  page: { slug: "acme", title: "Acme Status", locales: ["zh-CN", "en"] },
  groups: [{ key: "product", name: "产品", nameI18n: { en: "Product" } }],
  components: [
    {
      key: "identity-access",
      name: "登录与账号",
      group: "product",
      monitors: [{ url: "https://acme.test/health", intervalSeconds: 60 }],
    },
    { key: "learning-content", name: "学习内容", group: "product" },
    { key: "database", name: "数据库", public: false },
  ],
};

let t: TestDb;
const now = new Date("2026-10-16T12:00:00.000Z");

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.db.workspace.deleteMany();
});

describe("applyConfig", () => {
  it("creates the page from the file and is idempotent", async () => {
    await applyConfig(t.db, config);
    await applyConfig(t.db, config);
    expect(await t.db.component.count()).toBe(3);
    expect(await t.db.monitor.count()).toBe(1);
    expect(await t.db.componentGroup.count()).toBe(1);
  });

  it("renames in place and keeps history; removes what the file drops", async () => {
    const { page } = await applyConfig(t.db, config);
    const component = await t.db.component.findUniqueOrThrow({
      where: { pageId_key: { pageId: page.id, key: "learning-content" } },
    });
    await recordEvidence(t.db, {
      componentId: component.id,
      workspaceId: page.workspaceId,
      source: "journey",
      coverage: "synthetic",
      state: "operational",
      checkedAt: now,
      latencyMs: 80,
      note: null,
      freshnessSeconds: 300,
    });

    const components = config.components.filter((c) => c.key !== "database");
    const renamed = components.map((c) =>
      c.key === "learning-content" ? { ...c, name: "学习库" } : c,
    );
    await applyConfig(t.db, { ...config, components: renamed });

    const after = await t.db.component.findUniqueOrThrow({
      where: { pageId_key: { pageId: page.id, key: "learning-content" } },
      include: { days: true },
    });
    expect(after.name).toBe("学习库");
    expect(after.days).toHaveLength(1);
    expect(await t.db.component.count()).toBe(2);
  });

  it("rejects a component that names an unknown group", async () => {
    await expect(
      applyConfig(t.db, {
        ...config,
        components: [{ key: "x", name: "X", group: "missing" }],
      }),
    ).rejects.toThrow(/unknown group/);
  });
});

describe("evidence and snapshot", () => {
  it("derives state from pushed evidence and hides internal components", async () => {
    const { page } = await applyConfig(t.db, config);
    const pushed = await pushEvidence(
      t.db,
      page.id,
      {
        component: "identity-access",
        source: "journey.login",
        coverage: "synthetic",
        state: "operational",
        latencyMs: 210,
        freshnessSeconds: 300,
      },
      now,
    );
    expect(pushed).toEqual({
      change: {
        componentId: expect.any(String),
        source: "journey.login",
        from: null,
        to: "operational",
      },
    });

    const snapshot = await buildPageSnapshot(t.db, { slug: "acme" }, { now });
    expect(snapshot?.components.map((c) => c.key)).toEqual(["identity-access", "learning-content"]);
    const identity = snapshot?.components[0];
    expect(identity?.verdict).toMatchObject({ state: "operational", verified: true });
    expect(identity?.days.at(-1)).toMatchObject({
      total: 1,
      state: "operational",
      avgLatencyMs: 210,
    });
    // learning-content has no evidence yet, so the page is not green.
    expect(snapshot?.overall).toBe("degraded");
  });

  it("goes red when evidence stops arriving", async () => {
    const { page } = await applyConfig(t.db, config);
    await pushEvidence(
      t.db,
      page.id,
      {
        component: "identity-access",
        source: "journey.login",
        coverage: "synthetic",
        state: "operational",
        freshnessSeconds: 300,
      },
      now,
    );
    const later = new Date(now.getTime() + 11 * 60_000);
    const snapshot = await buildPageSnapshot(t.db, { slug: "acme" }, { now: later });
    expect(snapshot?.components[0]?.verdict).toMatchObject({ state: "outage", verified: false });
  });

  it("ignores a reading older than the stored one", async () => {
    const { page } = await applyConfig(t.db, config);
    const push = (state: "operational" | "outage", at: Date) =>
      pushEvidence(
        t.db,
        page.id,
        {
          component: "identity-access",
          source: "probe",
          coverage: "dependency",
          state,
          checkedAt: at.toISOString(),
          freshnessSeconds: 300,
        },
        now,
      );
    await push("operational", now);
    expect(await push("outage", new Date(now.getTime() - 60_000))).toEqual({ change: null });
    const evidence = await t.db.evidence.findFirstOrThrow({ where: { source: "probe" } });
    expect(evidence.state).toBe("operational");
  });

  it("refuses evidence for a component the page does not have", async () => {
    const { page } = await applyConfig(t.db, config);
    expect(
      await pushEvidence(t.db, page.id, {
        component: "nope",
        source: "x",
        coverage: "manual",
        state: "operational",
        freshnessSeconds: 60,
      }),
    ).toEqual({ error: "unknown_component" });
  });
});

describe("incidents", () => {
  it("raises affected components and keeps a timeline", async () => {
    const { page } = await applyConfig(t.db, config);
    const incident = await createIncident(
      t.db,
      page,
      {
        title: "登录失败率升高",
        impact: "critical",
        message: "正在排查。",
        messageI18n: { en: "Investigating." },
        components: ["identity-access"],
      },
      now,
    );
    let snapshot = await buildPageSnapshot(t.db, { slug: "acme" }, { now });
    expect(snapshot?.components[0]?.verdict.state).toBe("outage");
    expect(snapshot?.activeIncidents.map((i) => i.id)).toEqual([incident.id]);

    const resolved = await updateIncident(
      t.db,
      page.id,
      incident.id,
      { status: "resolved", message: "已恢复。" },
      new Date(now.getTime() + 3_600_000),
    );
    expect(resolved?.updates.map((u) => u.status)).toEqual(["investigating", "resolved"]);
    expect(resolved?.resolvedAt?.toISOString()).toBe("2026-10-16T13:00:00.000Z");

    snapshot = await buildPageSnapshot(t.db, { slug: "acme" }, { now });
    expect(snapshot?.activeIncidents).toHaveLength(0);
    expect(snapshot?.recentIncidents.map((i) => i.id)).toEqual([incident.id]);
  });

  it("puts components under maintenance only while the window is open", async () => {
    const { page } = await applyConfig(t.db, config);
    await createIncident(
      t.db,
      page,
      {
        kind: "maintenance",
        title: "数据库升级",
        impact: "none",
        message: "计划维护。",
        components: ["learning-content"],
        scheduledStart: "2026-10-16T11:00:00.000Z",
        scheduledEnd: "2026-10-16T13:00:00.000Z",
      },
      now,
    );
    const during = await buildPageSnapshot(t.db, { slug: "acme" }, { now });
    expect(during?.components[1]?.verdict.state).toBe("maintenance");
    expect(during?.maintenance[0]?.phase).toBe("in_progress");

    const after = await buildPageSnapshot(
      t.db,
      { slug: "acme" },
      {
        now: new Date("2026-10-16T14:00:00.000Z"),
      },
    );
    expect(after?.maintenance).toHaveLength(0);
    expect(after?.components[1]?.verdict.state).toBe("unknown");
  });

  it("rejects maintenance without a window and unknown components", async () => {
    const { page } = await applyConfig(t.db, config);
    await expect(
      createIncident(t.db, page, { kind: "maintenance", title: "x", message: "x" }),
    ).rejects.toThrow();
    await expect(
      createIncident(t.db, page, { title: "x", message: "x", components: ["ghost"] }),
    ).rejects.toThrow(/Unknown components: ghost/);
  });
});

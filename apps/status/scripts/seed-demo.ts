/**
 * Seeds a demo page for previewing the public UI locally. Never run against a
 * real instance — it writes invented history.
 *
 *   STATUS_DATABASE_URL=postgres://… npx prisma migrate deploy
 *   STATUS_DATABASE_URL=postgres://… npx tsx scripts/seed-demo.ts
 *
 * To keep the preview live afterwards, run scripts/preview-pulse.ts next to
 * the server: it pushes fresh evidence every 30 s.
 *
 * The page it creates (slug `demo`) is bilingual, has groups, a fresh
 * synthetic journey, a quiet source, an open incident, scheduled
 * maintenance and resolved history — every state the page can draw.
 */
import { applyConfig } from "@/server/config";
import { getDb } from "@/server/db";
import { pushEvidence } from "@/server/evidence";
import { createIncident, updateIncident } from "@/server/incidents";

const DAY = 86_400_000;
const now = new Date();

function utcDay(offset: number): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - offset * DAY);
}

/** Deterministic pseudo-random so every seed draws the same history. */
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

async function main() {
  if (process.env.STATUS_DATABASE_URL?.includes("prod"))
    throw new Error("refusing: looks like prod");
  const db = getDb();
  await applyConfig(db, {
    workspace: { slug: "demo", name: "Demo" },
    page: {
      slug: "demo",
      title: "Acme",
      description: "Acme platform status",
      locales: ["zh-CN", "en"],
    },
    groups: [
      { key: "app", name: "应用", nameI18n: { en: "Application" } },
      { key: "ai", name: "AI 服务", nameI18n: { en: "AI services" } },
      { key: "edge", name: "边缘节点", nameI18n: { en: "Edge" } },
    ],
    components: [
      { key: "website", name: "官网", nameI18n: { en: "Website" } },
      { key: "login", name: "登录与注册", nameI18n: { en: "Sign-in" }, group: "app" },
      { key: "api", name: "开放 API", nameI18n: { en: "Public API" }, group: "app" },
      { key: "console", name: "控制台", nameI18n: { en: "Console" }, group: "app" },
      { key: "chat", name: "对话模型", nameI18n: { en: "Chat models" }, group: "ai" },
      { key: "images", name: "图像生成", nameI18n: { en: "Image generation" }, group: "ai" },
      { key: "cn-edge", name: "中国大陆", nameI18n: { en: "Mainland China" }, group: "edge" },
      { key: "global-edge", name: "全球", nameI18n: { en: "Global" }, group: "edge" },
    ],
  });
  const page = await db.page.findUniqueOrThrow({ where: { slug: "demo" } });
  const components = await db.component.findMany({ where: { pageId: page.id } });

  // History: the instance "started" 64 days ago, so older days stay no-data.
  for (const [ci, c] of components.entries()) {
    for (let offset = 1; offset < 64; offset += 1) {
      const r = rand(ci * 1000 + offset);
      const total = 288;
      const outage = r > 0.985 ? Math.round(total * 0.08) : 0;
      const degraded = r > 0.95 ? Math.round(total * 0.04) : 0;
      const latency = 120 + Math.round(rand(ci + offset * 7) * 180);
      await db.dailyStat.upsert({
        where: { componentId_day: { componentId: c.id, day: utcDay(offset) } },
        create: {
          componentId: c.id,
          day: utcDay(offset),
          total,
          outage,
          degraded,
          latencySum: BigInt(latency * total),
          latencyCount: total,
        },
        update: {},
      });
    }
  }

  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const readings = [
    {
      component: "website",
      source: "http-home",
      coverage: "dependency",
      state: "operational",
      checkedAt: ago(1),
      freshnessSeconds: 300,
      latencyMs: 142,
    },
    {
      component: "login",
      source: "journey-login",
      coverage: "synthetic",
      state: "operational",
      checkedAt: ago(2),
      freshnessSeconds: 600,
      latencyMs: 820,
    },
    {
      component: "login",
      source: "http-auth",
      coverage: "dependency",
      state: "operational",
      checkedAt: ago(1),
      freshnessSeconds: 300,
      latencyMs: 96,
    },
    {
      component: "api",
      source: "http-api",
      coverage: "dependency",
      state: "degraded",
      checkedAt: ago(1),
      freshnessSeconds: 300,
      latencyMs: 2140,
      note: "p95 above 2s",
    },
    {
      component: "console",
      source: "journey-console",
      coverage: "synthetic",
      state: "operational",
      checkedAt: ago(23),
      freshnessSeconds: 900,
      latencyMs: 1310,
    },
    {
      component: "chat",
      source: "upstream-deepseek",
      coverage: "upstream",
      state: "operational",
      checkedAt: ago(4),
      freshnessSeconds: 600,
    },
    {
      component: "cn-edge",
      source: "http-cn",
      coverage: "dependency",
      state: "operational",
      checkedAt: ago(1),
      freshnessSeconds: 300,
      latencyMs: 61,
    },
    {
      component: "global-edge",
      source: "http-global",
      coverage: "dependency",
      state: "operational",
      checkedAt: ago(1),
      freshnessSeconds: 300,
      latencyMs: 88,
    },
  ] as const;
  for (const r of readings) await pushEvidence(db, page.id, { ...r }, now);
  // `images` gets no evidence at all: the page must say so rather than guess.

  const existing = await db.incident.count({ where: { pageId: page.id } });
  if (existing === 0) {
    const open = await createIncident(
      db,
      page,
      {
        title: "开放 API 响应变慢",
        impact: "minor",
        message: "部分 API 请求的 p95 延迟超过 2 秒，正在排查。",
        messageI18n: { en: "Some API requests take over 2s at p95. We are investigating." },
        components: ["api"],
      },
      new Date(now.getTime() - 95 * 60_000),
    );
    await updateIncident(
      db,
      page.id,
      open.id,
      {
        status: "identified",
        message: "定位到一个数据库连接池配置问题，正在回滚。",
        messageI18n: { en: "Traced to a database pool setting; rolling it back." },
      },
      new Date(now.getTime() - 40 * 60_000),
    );

    const past = await createIncident(
      db,
      page,
      {
        title: "登录短信验证码延迟",
        impact: "major",
        message: "部分用户收不到短信验证码。",
        messageI18n: { en: "Some users are not receiving SMS codes." },
        components: ["login"],
      },
      new Date(utcDay(12).getTime() + 3 * 3_600_000),
    );
    await updateIncident(
      db,
      page.id,
      past.id,
      {
        status: "monitoring",
        message: "已切换到备用短信通道，观察中。",
        messageI18n: { en: "Switched to the backup SMS route; monitoring." },
      },
      new Date(utcDay(12).getTime() + 4 * 3_600_000),
    );
    await updateIncident(
      db,
      page.id,
      past.id,
      {
        status: "resolved",
        message: "短信送达率已恢复正常。",
        messageI18n: { en: "SMS delivery is back to normal." },
      },
      new Date(utcDay(12).getTime() + 5 * 3_600_000 + 20 * 60_000),
    );

    const older = await createIncident(
      db,
      page,
      {
        title: "对话模型上游中断",
        impact: "critical",
        message: "上游模型供应商出现故障。",
        messageI18n: { en: "Our upstream model provider is down." },
        components: ["chat"],
      },
      new Date(utcDay(41).getTime() + 14 * 3_600_000),
    );
    await updateIncident(
      db,
      page.id,
      older.id,
      {
        status: "resolved",
        message: "上游已恢复，请求正常。",
        messageI18n: { en: "Upstream recovered; requests are succeeding." },
      },
      new Date(utcDay(41).getTime() + 16 * 3_600_000),
    );

    await createIncident(db, page, {
      kind: "maintenance",
      title: "数据库升级",
      impact: "minor",
      message: "升级主数据库版本，期间控制台可能只读。",
      messageI18n: { en: "Upgrading the primary database; the console may be read-only." },
      components: ["console"],
      scheduledStart: new Date(utcDay(-2).getTime() + 18 * 3_600_000).toISOString(),
      scheduledEnd: new Date(utcDay(-2).getTime() + 19 * 3_600_000).toISOString(),
    });
  }
  process.stdout.write("seeded /p/demo\n");
  await db.$disconnect();
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});

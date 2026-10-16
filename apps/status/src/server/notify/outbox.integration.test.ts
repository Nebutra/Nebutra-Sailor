/** Subscribers, triggers and the delivery outbox on PGlite, with a fake transport. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  GET as channelsRoute,
  POST as subscribeRoute,
} from "@/app/api/v1/pages/[slug]/subscribe/route";
import { GET as confirmRoute } from "@/app/api/v1/subscriptions/confirm/route";
import { GET as unsubForm, POST as unsubPost } from "@/app/api/v1/subscriptions/unsubscribe/route";
import { applyConfig, type StatusConfig } from "../config";
import { setDbForTests } from "../db";
import { pushEvidence } from "../evidence";
import { createIncident, updateIncident } from "../incidents";
import { createTestDb, type TestDb } from "../testing";
import {
  backoffMs,
  confirmSubscription,
  enqueueComponentChanges,
  enqueueMaintenanceStarts,
  MAX_ATTEMPTS,
  processDeliveries,
  SubscribeError,
  subscribe,
  unsubscribe,
} from "./outbox";
import { DeliveryError, type Transport } from "./transport";

const config: StatusConfig = {
  workspace: { slug: "acme", name: "Acme" },
  page: { slug: "acme", title: "Acme", locales: ["zh-CN", "en"] },
  components: [
    { key: "api", name: "API" },
    { key: "web", name: "Web" },
  ],
};
const FEISHU = "https://open.feishu.cn/open-apis/bot/v2/hook/abc";
const SLACK = "https://hooks.slack.com/services/T/B/x";

let t: TestDb;
let page: { id: string; workspaceId: string; slug: string };
const now = new Date("2026-10-16T08:00:00.000Z");

function fakeTransport(fail?: (target: string) => Error | null): Transport & {
  posts: Array<{ url: string; body: Record<string, unknown> }>;
  mails: Array<{ to: string; subject: string; text: string }>;
} {
  const posts: Array<{ url: string; body: Record<string, unknown> }> = [];
  const mails: Array<{ to: string; subject: string; text: string }> = [];
  return {
    posts,
    mails,
    now: () => now,
    resolve: async () => ["93.184.216.34"],
    fetch: (async (input: URL | string, init?: RequestInit) => {
      const url = String(input);
      const error = fail?.(url);
      // A final error is what a refusing endpoint looks like: a 4xx.
      if (error instanceof DeliveryError && !error.retryable)
        return new Response("no", { status: 404 });
      if (error) throw error;
      posts.push({ url, body: JSON.parse(String(init?.body)) });
      return new Response(url.includes("slack") ? "ok" : '{"code":0}');
    }) as typeof fetch,
    sendMail: async (to, message) => {
      const error = fail?.(to);
      if (error) throw error;
      mails.push({ to, subject: message.subject, text: message.text });
    },
  };
}

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
  ({ page } = await applyConfig(t.db, config));
  process.env.STATUS_PUBLIC_URL = "https://status.acme.test";
});
afterEach(() => {
  delete process.env.STATUS_SMTP_URL;
  delete process.env.STATUS_MAIL_FROM;
  delete process.env.STATUS_PUBLIC_URL;
  delete process.env.STATUS_NOTIFY_COMPONENT_CHANGES;
});

const enableEmail = () => {
  process.env.STATUS_SMTP_URL = "smtp://localhost:2525";
  process.env.STATUS_MAIL_FROM = "Status <status@acme.test>";
};

describe("subscribe", () => {
  it("refuses email without SMTP, says which channels exist", async () => {
    await expect(
      subscribe(t.db, page, { channel: "email", target: "a@acme.test" }),
    ).rejects.toMatchObject({
      code: "email_disabled",
    });
    const res = await channelsRoute(new Request("https://s/x"), {
      params: Promise.resolve({ slug: "acme" }),
    });
    expect((await res.json()).channels).not.toContain("email");
    enableEmail();
    const again = await channelsRoute(new Request("https://s/x"), {
      params: Promise.resolve({ slug: "acme" }),
    });
    expect((await again.json()).channels).toContain("email");
  });

  it("email: double opt-in — confirmation first, notices only after confirming", async () => {
    enableEmail();
    const result = await subscribe(
      t.db,
      page,
      { channel: "email", target: "A@Acme.test", locale: "en" },
      now,
    );
    expect(result).toEqual({ id: expect.any(String), status: "pending_confirmation" });

    const transport = fakeTransport();
    await processDeliveries(t.db, { now, transport });
    expect(transport.mails).toHaveLength(1);
    expect(transport.mails[0]?.to).toBe("a@acme.test");
    const token = /token=([\w-]+)/.exec(transport.mails[0]?.text ?? "")?.[1] ?? "";
    expect(transport.mails[0]?.text).toContain(
      "https://status.acme.test/api/v1/subscriptions/confirm?token=",
    );

    await createIncident(t.db, page, { title: "Down", message: "Looking." }, now);
    expect(await t.db.delivery.count({ where: { event: "incident.created" } })).toBe(0);

    expect(await confirmSubscription(t.db, token, now)).toBe(true);
    await createIncident(t.db, page, { title: "Down again", message: "Looking." }, now);
    expect(await t.db.delivery.count({ where: { event: "incident.created" } })).toBe(1);
  });

  it("bots: active at once with a welcome, idempotent, revived after unsubscribe", async () => {
    const first = await subscribe(
      t.db,
      page,
      { channel: "feishu", target: FEISHU, secret: "s" },
      now,
    );
    expect(first.status).toBe("active");
    expect(first.unsubscribeUrl).toMatch(
      /^https:\/\/status\.acme\.test\/api\/v1\/subscriptions\/unsubscribe\?token=/,
    );
    await subscribe(t.db, page, { channel: "feishu", target: FEISHU }, now);
    expect(await t.db.subscriber.count()).toBe(1);
    expect(await t.db.delivery.count({ where: { event: "subscription.welcome" } })).toBe(1);

    const token = first.unsubscribeUrl?.split("token=")[1] ?? "";
    expect(await unsubscribe(t.db, token, now)).toBe(true);
    const revived = await subscribe(t.db, page, { channel: "feishu", target: FEISHU }, now);
    expect(revived.status).toBe("active");
    expect(revived.unsubscribeUrl).not.toBe(first.unsubscribeUrl);
  });

  it("rejects foreign hosts and unknown components", async () => {
    await expect(
      subscribe(t.db, page, { channel: "slack", target: "https://evil.test/x" }),
    ).rejects.toBeInstanceOf(SubscribeError);
    await expect(
      subscribe(t.db, page, { channel: "slack", target: SLACK, components: ["ghost"] }),
    ).rejects.toMatchObject({ code: "unknown_components" });
  });
});

describe("triggers", () => {
  it("filters by component; empty means all; only timeline updates notify", async () => {
    await subscribe(t.db, page, { channel: "slack", target: SLACK, components: ["web"] }, now);
    await subscribe(t.db, page, { channel: "feishu", target: FEISHU }, now);
    await t.db.delivery.deleteMany();

    const apiIncident = await createIncident(
      t.db,
      page,
      { title: "API slow", message: "x", components: ["api"] },
      now,
    );
    expect(await t.db.delivery.count()).toBe(1); // feishu only
    await createIncident(t.db, page, { title: "Everything", message: "x" }, now);
    expect(await t.db.delivery.count()).toBe(3); // both

    await updateIncident(t.db, page.id, apiIncident.id, { title: "API slow (EU)" }, now);
    expect(await t.db.delivery.count()).toBe(3);
    await updateIncident(
      t.db,
      page.id,
      apiIncident.id,
      { status: "resolved", message: "Fixed." },
      now,
    );
    expect(await t.db.delivery.count({ where: { event: "incident.updated" } })).toBe(1);
  });

  it("renders per subscriber locale and translated update text", async () => {
    await subscribe(t.db, page, { channel: "slack", target: SLACK, locale: "en" }, now);
    await subscribe(t.db, page, { channel: "feishu", target: FEISHU }, now); // page default zh-CN
    await t.db.delivery.deleteMany();
    await createIncident(
      t.db,
      page,
      { title: "API", message: "正在调查", messageI18n: { en: "Investigating" } },
      now,
    );
    const transport = fakeTransport();
    await processDeliveries(t.db, { now, transport });
    const slack = transport.posts.find((p) => p.url.includes("slack"));
    const feishu = transport.posts.find((p) => p.url.includes("feishu"));
    expect(slack?.body.text).toBe("[New incident] API");
    expect(JSON.stringify(slack?.body)).toContain("Investigating");
    expect(JSON.stringify(feishu?.body)).toContain("[新事故] API");
    expect(JSON.stringify(feishu?.body)).toContain("正在调查");
    expect(JSON.stringify(feishu?.body)).toContain("https://status.acme.test/p/acme/incidents/");
  });

  it("reminds once when a maintenance window opens", async () => {
    await subscribe(t.db, page, { channel: "slack", target: SLACK }, now);
    await t.db.delivery.deleteMany();
    await createIncident(
      t.db,
      page,
      {
        kind: "maintenance",
        title: "DB upgrade",
        message: "Planned.",
        scheduledStart: "2026-10-16T09:00:00.000Z",
        scheduledEnd: "2026-10-16T10:00:00.000Z",
      },
      now,
    );
    expect(await t.db.delivery.count()).toBe(1); // scheduled notice
    expect(await enqueueMaintenanceStarts(t.db, now)).toBe(0);
    const during = new Date("2026-10-16T09:00:30.000Z");
    expect(await enqueueMaintenanceStarts(t.db, during)).toBe(1);
    expect(await enqueueMaintenanceStarts(t.db, during)).toBe(0);
    expect(await t.db.delivery.count({ where: { event: "maintenance.started" } })).toBe(1);
  });

  it("component changes: off by default; first evaluation records, later changes notify", async () => {
    await subscribe(t.db, page, { channel: "slack", target: SLACK, components: ["api"] }, now);
    await t.db.delivery.deleteMany();
    const reading = (state: "operational" | "outage") =>
      pushEvidence(
        t.db,
        page.id,
        { component: "api", source: "probe", coverage: "synthetic", state, freshnessSeconds: 300 },
        now,
      );
    await reading("operational");
    expect(await enqueueComponentChanges(t.db, now)).toBe(0);
    await reading("outage");
    const later = new Date(now.getTime() + 1000);
    await pushEvidence(
      t.db,
      page.id,
      {
        component: "api",
        source: "probe",
        coverage: "synthetic",
        state: "outage",
        freshnessSeconds: 300,
      },
      later,
    );
    expect(await enqueueComponentChanges(t.db, later)).toBe(1);
    expect(await enqueueComponentChanges(t.db, later)).toBe(0);
    const d = await t.db.delivery.findFirstOrThrow({ where: { event: "component.changed" } });
    expect(JSON.stringify(d.payload)).toContain("API · 中断"); // page default zh-CN
  });
});

describe("processDeliveries", () => {
  it("retries with backoff, gives up after MAX_ATTEMPTS, stops on final errors", async () => {
    await subscribe(t.db, page, { channel: "slack", target: SLACK }, now);
    await subscribe(t.db, page, { channel: "feishu", target: FEISHU }, now);
    const flaky = fakeTransport((url) =>
      url.includes("slack") ? new DeliveryError("HTTP 503") : new DeliveryError("HTTP 404", false),
    );
    const run = await processDeliveries(t.db, { now, transport: flaky });
    expect(run).toMatchObject({ retried: 1, dead: 1 });
    const slack = await t.db.delivery.findFirstOrThrow({
      where: { subscriber: { channel: "slack" } },
    });
    expect(slack.attempts).toBe(1);
    expect(slack.nextAttemptAt.getTime()).toBe(now.getTime() + backoffMs(1));

    // Not due yet: nothing happens.
    expect((await processDeliveries(t.db, { now, transport: flaky })).retried).toBe(0);

    let clock = now.getTime();
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      clock += backoffMs(i) + 1;
      await processDeliveries(t.db, { now: new Date(clock), transport: flaky });
    }
    const dead = await t.db.delivery.findUniqueOrThrow({ where: { id: slack.id } });
    expect(dead).toMatchObject({ status: "dead", attempts: MAX_ATTEMPTS, lastError: "HTTP 503" });
    const final = await t.db.delivery.findFirstOrThrow({
      where: { subscriber: { channel: "feishu" } },
    });
    expect(final).toMatchObject({ status: "dead", attempts: 1, lastError: "HTTP 404" });
  });

  it("sends, and cancels what an unsubscribe left behind", async () => {
    const sub = await subscribe(t.db, page, { channel: "slack", target: SLACK }, now);
    await createIncident(t.db, page, { title: "A", message: "x" }, now);
    const token = sub.unsubscribeUrl?.split("token=")[1] ?? "";
    await unsubscribe(t.db, token, now);
    const run = await processDeliveries(t.db, { now, transport: fakeTransport() });
    expect(run.sent).toBe(0);
    expect(await t.db.delivery.count({ where: { status: "cancelled" } })).toBe(2);

    await subscribe(t.db, page, { channel: "slack", target: SLACK }, now);
    const sent = await processDeliveries(t.db, { now, transport: fakeTransport() });
    expect(sent.sent).toBe(1);
    expect(await t.db.delivery.count({ where: { status: "sent" } })).toBe(1);
  });
});

describe("routes", () => {
  const ctx = { params: Promise.resolve({ slug: "acme" }) };
  const post = (body: unknown, ip = "203.0.113.5") =>
    subscribeRoute(
      new Request("https://status.acme.test/api/v1/pages/acme/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": ip },
        body: JSON.stringify(body),
      }),
      ctx,
    );

  it("subscribes, confirms and unsubscribes over HTTP", async () => {
    expect((await post({ channel: "email", target: "x@acme.test" })).status).toBe(409);
    expect((await post({ channel: "slack", target: "https://evil.test/" })).status).toBe(422);
    const bot = await post({ channel: "slack", target: SLACK });
    expect(bot.status).toBe(201);

    enableEmail();
    const email = await post({ channel: "email", target: "x@acme.test" });
    expect(email.status).toBe(202);
    expect(await email.json()).not.toHaveProperty("unsubscribeUrl");

    const subscriber = await t.db.subscriber.findFirstOrThrow({ where: { channel: "email" } });
    const confirm = await confirmRoute(
      new Request(`https://s/api/v1/subscriptions/confirm?token=${subscriber.token}`, {
        headers: { "accept-language": "zh-CN" },
      }),
    );
    expect(confirm.status).toBe(200);
    expect(await confirm.text()).toContain("订阅已确认");
    expect((await confirmRoute(new Request("https://s/c?token=nope"))).status).toBe(404);

    const url = `https://s/api/v1/subscriptions/unsubscribe?token=${subscriber.token}`;
    const form = await unsubForm(new Request(url));
    expect(await form.text()).toContain('method="post"');
    expect(
      (await t.db.subscriber.findUniqueOrThrow({ where: { id: subscriber.id } })).unsubscribedAt,
    ).toBeNull();

    // RFC 8058 one-click from a mail client.
    const oneClick = await unsubPost(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      }),
    );
    expect(oneClick.status).toBe(200);
    expect(
      (await t.db.subscriber.findUniqueOrThrow({ where: { id: subscriber.id } })).unsubscribedAt,
    ).not.toBeNull();
  });

  it("limits confirmation emails per address", async () => {
    enableEmail();
    for (let i = 0; i < 3; i++) {
      expect(
        (await post({ channel: "email", target: "spam@acme.test" }, `198.18.0.${i}`)).status,
      ).toBe(202);
    }
    expect((await post({ channel: "email", target: "spam@acme.test" }, "198.18.0.9")).status).toBe(
      429,
    );
  });
});

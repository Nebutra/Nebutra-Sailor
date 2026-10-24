import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { langOf, type Notice, render } from "./messages";
import {
  checkTarget,
  DeliveryError,
  dingtalkSign,
  feishuSign,
  isPrivateAddress,
  send,
  type Transport,
  webhookSignature,
} from "./transport";

const notice: Notice = {
  event: "incident.created",
  page: { slug: "acme", title: "Acme", url: "https://s.test/p/acme" },
  incident: {
    id: "inc1",
    kind: "incident",
    title: "Login <errors>",
    impact: "major",
    status: "investigating",
    message: "We are on it & looking.",
    scheduledStart: null,
    scheduledEnd: null,
    components: ["sign-in"],
    url: "https://s.test/p/acme/incidents/inc1",
    updatedAt: "2026-10-16T08:00:00.000Z",
  },
  unsubscribeUrl: "https://s.test/api/v1/subscriptions/unsubscribe?token=t",
};

describe("render", () => {
  it("picks the language from the locale", () => {
    expect(langOf("zh-CN")).toBe("zh");
    expect(langOf("zh-TW")).toBe("zh");
    expect(langOf("en")).toBe("en");
    expect(langOf(null)).toBe("en");
  });

  it("Feishu: interactive card with impact colour, fields, link and unsubscribe", () => {
    const r = render(notice, "feishu", "zh-CN");
    if (r.channel === "email") throw new Error("unexpected");
    const card = (r.body as { card: Record<string, any> }).card;
    expect(r.body.msg_type).toBe("interactive");
    expect(card.header).toEqual({
      template: "orange",
      title: { tag: "plain_text", content: "[新事故] Login <errors>" },
    });
    expect(JSON.stringify(card)).toContain("**状态**\\n调查中");
    const buttons = card.elements.at(-1).actions;
    expect(buttons.map((b: { url: string }) => b.url)).toEqual([
      notice.incident?.url,
      notice.unsubscribeUrl,
    ]);
  });

  it("DingTalk and WeCom: markdown, English when asked", () => {
    const d = render(notice, "dingtalk", "en");
    const w = render(notice, "wecom", "en");
    if (d.channel === "email" || w.channel === "email") throw new Error("unexpected");
    const text = (d.body.markdown as { text: string }).text;
    expect(d.body.msgtype).toBe("markdown");
    expect(text).toContain("### [New incident] Login <errors>");
    expect(text).toContain("**Impact**: Major");
    expect(text).toContain("[View on status page](https://s.test/p/acme/incidents/inc1)");
    expect((w.body.markdown as { content: string }).content).toContain('<font color="comment">');
  });

  it("Slack: blocks with buttons", () => {
    const r = render({ ...notice, event: "incident.updated" }, "slack", "en");
    if (r.channel === "email") throw new Error("unexpected");
    expect(r.body.text).toBe("[Incident update] Login <errors>");
    expect((r.body.blocks as Array<{ type: string }>).map((b) => b.type)).toEqual([
      "header",
      "section",
      "section",
      "actions",
    ]);
  });

  it("email: escaped HTML, plain text and the unsubscribe link", () => {
    const r = render(notice, "email", "en");
    if (r.channel !== "email") throw new Error("unexpected");
    expect(r.email.subject).toBe("Acme · [New incident] Login <errors>");
    expect(r.email.html).toContain("Login &lt;errors&gt;");
    expect(r.email.html).toContain("on it &amp; looking");
    expect(r.email.text).toContain(`Unsubscribe: ${notice.unsubscribeUrl}`);
  });

  it("maintenance shows its window; resolved reads green", () => {
    const m: Notice = {
      ...notice,
      event: "maintenance.started",
      incident: {
        ...(notice.incident as NonNullable<Notice["incident"]>),
        kind: "maintenance",
        scheduledStart: "2026-10-17T01:00:00.000Z",
        scheduledEnd: "2026-10-17T02:00:00.000Z",
      },
    };
    const r = render(m, "slack", "zh");
    if (r.channel === "email") throw new Error("unexpected");
    expect(r.body.text).toBe("[维护开始] Login <errors>");
    expect(JSON.stringify(r.body)).toContain("2026-10-17 01:00 UTC – 2026-10-17 02:00 UTC");
    const done = render(
      {
        ...notice,
        incident: { ...(notice.incident as NonNullable<Notice["incident"]>), status: "resolved" },
      },
      "feishu",
      "en",
    );
    if (done.channel === "email") throw new Error("unexpected");
    expect((done.body as { card: { header: { template: string } } }).card.header.template).toBe(
      "green",
    );
  });

  it("confirmation email carries the confirm link", () => {
    const r = render(
      {
        event: "subscription.confirm",
        page: notice.page,
        confirmUrl: "https://s.test/c?token=x",
        unsubscribeUrl: "u",
      },
      "email",
      "zh-CN",
    );
    if (r.channel !== "email") throw new Error("unexpected");
    expect(r.email.subject).toBe("请确认订阅 · Acme");
    expect(r.email.text).toContain("确认订阅: https://s.test/c?token=x");
  });
});

describe("targets", () => {
  afterEach(() => {
    delete process.env.STATUS_WEBHOOK_ALLOW_PRIVATE;
  });

  it("bots reach only their vendor hosts over https", () => {
    expect(checkTarget("feishu", "https://open.feishu.cn/open-apis/bot/v2/hook/x")).toBeNull();
    expect(checkTarget("feishu", "https://evil.test/open-apis/bot/v2/hook/x")).toBe(
      "host_not_allowed",
    );
    expect(
      checkTarget("dingtalk", "https://oapi.dingtalk.com/robot/send?access_token=x"),
    ).toBeNull();
    expect(
      checkTarget("wecom", "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x"),
    ).toBeNull();
    expect(checkTarget("slack", "http://hooks.slack.com/services/x")).toBe("https_required");
  });

  it("webhooks must be https to a public host unless private is allowed", () => {
    expect(checkTarget("webhook", "https://hooks.example.com/status")).toBeNull();
    expect(checkTarget("webhook", "http://hooks.example.com/status")).toBe("https_required");
    expect(checkTarget("webhook", "https://127.0.0.1/x")).toBe("private_address");
    expect(checkTarget("webhook", "https://localhost/x")).toBe("private_address");
    expect(checkTarget("webhook", "https://[::1]/x")).toBe("private_address");
    expect(checkTarget("webhook", "https://user:pw@hooks.example.com/")).toBe("invalid_url");
    process.env.STATUS_WEBHOOK_ALLOW_PRIVATE = "on";
    expect(checkTarget("webhook", "http://127.0.0.1:8080/x")).toBeNull();
  });

  it("classifies private addresses", () => {
    for (const a of [
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "127.0.0.1",
      "169.254.169.254",
      "100.64.0.1",
      "::1",
      "fd00::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(a)).toBe(true);
    }
    for (const a of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"])
      expect(isPrivateAddress(a)).toBe(false);
  });
});

describe("send", () => {
  const now = new Date("2026-10-16T08:00:00.000Z");
  function transport(response: Response | Error): Transport & { fetch: ReturnType<typeof vi.fn> } {
    return {
      fetch: vi.fn(async () => {
        if (response instanceof Error) throw response;
        return response.clone();
      }),
      sendMail: vi.fn(async () => undefined),
      resolve: async () => ["93.184.216.34"],
      now: () => now,
    } as never;
  }
  const feishuBody = render(notice, "feishu", "en");

  it("signs Feishu in the body (notify.ts algorithm)", async () => {
    const t = transport(new Response('{"code":0}'));
    await send(
      {
        channel: "feishu",
        target: "https://open.feishu.cn/open-apis/bot/v2/hook/x",
        secret: "s3cret",
      },
      feishuBody,
      t,
      "incident.created",
    );
    const body = JSON.parse(t.fetch.mock.calls[0]?.[1].body);
    const ts = Math.floor(now.getTime() / 1000);
    expect(body.timestamp).toBe(String(ts));
    expect(body.sign).toBe(createHmac("sha256", `${ts}\ns3cret`).update("").digest("base64"));
    expect(body.sign).toBe(feishuSign(ts, "s3cret"));
  });

  it("signs DingTalk in the query string", async () => {
    const t = transport(new Response('{"errcode":0,"errmsg":"ok"}'));
    await send(
      {
        channel: "dingtalk",
        target: "https://oapi.dingtalk.com/robot/send?access_token=abc",
        secret: "SEC1",
      },
      render(notice, "dingtalk", "en"),
      t,
      "incident.created",
    );
    const url = t.fetch.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("access_token")).toBe("abc");
    expect(url.searchParams.get("timestamp")).toBe(String(now.getTime()));
    expect(url.searchParams.get("sign")).toBe(dingtalkSign(now.getTime(), "SEC1"));
  });

  it("signs generic webhooks in a header", async () => {
    const t = transport(new Response("accepted", { status: 202 }));
    await send(
      { channel: "webhook", target: "https://93.184.216.34/hook", secret: "k" },
      render(notice, "webhook", "en"),
      t,
      "incident.created",
    );
    const init = t.fetch.mock.calls[0]?.[1];
    expect(init.headers["x-nebutra-event"]).toBe("incident.created");
    expect(init.headers["x-nebutra-signature"]).toBe(
      webhookSignature(Math.floor(now.getTime() / 1000), init.body, "k"),
    );
    expect(init.redirect).toBe("manual");
  });

  it("treats platform error codes and 5xx as retryable, other 4xx as final", async () => {
    const target = {
      channel: "wecom" as const,
      target: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x",
      secret: null,
    };
    const wecom = render(notice, "wecom", "en");
    await expect(
      send(target, wecom, transport(new Response('{"errcode":93000,"errmsg":"invalid"}')), "e"),
    ).rejects.toMatchObject({ retryable: true, message: expect.stringContaining("93000") });
    await expect(
      send(target, wecom, transport(new Response("x", { status: 503 })), "e"),
    ).rejects.toMatchObject({ retryable: true });
    await expect(
      send(target, wecom, transport(new Response("x", { status: 404 })), "e"),
    ).rejects.toMatchObject({ retryable: false });
    await expect(
      send(target, wecom, transport(new TypeError("fetch failed")), "e"),
    ).rejects.toBeInstanceOf(DeliveryError);
  });

  it("refuses a webhook that resolves privately at send time", async () => {
    const t = transport(new Response("ok"));
    await expect(
      send(
        { channel: "webhook", target: "https://rebind.example.com/x", secret: null },
        render(notice, "webhook", "en"),
        { ...t, resolve: async () => ["10.0.0.5"] },
        "e",
      ),
    ).rejects.toMatchObject({ retryable: false });
    await expect(
      send(
        { channel: "webhook", target: "https://127.0.0.1/x", secret: null },
        render(notice, "webhook", "en"),
        t,
        "e",
      ),
    ).rejects.toMatchObject({ retryable: false });
    expect(t.fetch).not.toHaveBeenCalled();
  });

  it("hands email to the mailer", async () => {
    const t = transport(new Response("ok"));
    const email = render(notice, "email", "en");
    await send({ channel: "email", target: "a@b.test", secret: null }, email, t, "e");
    expect(t.sendMail).toHaveBeenCalledWith(
      "a@b.test",
      expect.objectContaining({ subject: expect.any(String) }),
      notice.unsubscribeUrl,
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  feishuOpsAlertPayload,
  notifyOpsAlert,
  type OpsAlertPayload,
  slackOpsAlertPayload,
} from "./notify";

describe("feishuOpsAlertPayload / slackOpsAlertPayload", () => {
  const alert: OpsAlertPayload = {
    title: "Supply quota WARN_80 — goat · 5h",
    detail: "12.30/14 USD used, resets 2026-09-30T05:00:00.000Z.",
    severity: "warn",
    url: "https://router.example.com/management.html#quota",
  };

  it("builds a Feishu card with no StatusIncident dependency", () => {
    const card = feishuOpsAlertPayload(alert);
    expect(card.card.header.title.content).toBe(alert.title);
    expect(card.card.header.template).toBe("yellow");
    expect(JSON.stringify(card)).toContain(alert.detail);
    expect(JSON.stringify(card)).toContain(alert.url);
  });

  it("builds a Slack blocks payload", () => {
    const payload = slackOpsAlertPayload(alert);
    expect(payload.text).toBe(alert.title);
    expect(JSON.stringify(payload)).toContain(alert.detail);
  });

  it("omits the detail/action blocks when absent", () => {
    const bare = feishuOpsAlertPayload({ title: "x", severity: "critical" });
    expect(bare.card.elements).toEqual([]);
  });

  it("maps severity to the right Feishu template color", () => {
    expect(feishuOpsAlertPayload({ title: "x", severity: "critical" }).card.header.template).toBe(
      "red",
    );
    expect(feishuOpsAlertPayload({ title: "x", severity: "info" }).card.header.template).toBe(
      "blue",
    );
  });
});

describe("notifyOpsAlert", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STATUS_FEISHU_WEBHOOK_URL = "https://feishu.example/webhook";
    process.env.STATUS_SLACK_WEBHOOK_URL = "https://slack.example/webhook";
    delete process.env.STATUS_FEISHU_WEBHOOK_SECRET;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("posts to every configured webhook", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: string) => {
      calls.push(String(url));
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    await notifyOpsAlert({ title: "Supply quota EXHAUSTED — goat", severity: "critical" });
    expect(calls.sort()).toEqual(
      ["https://feishu.example/webhook", "https://slack.example/webhook"].sort(),
    );
  });

  it("never throws when a webhook fails", async () => {
    global.fetch = vi.fn(
      async () => new Response(null, { status: 500 }),
    ) as unknown as typeof fetch;
    await expect(notifyOpsAlert({ title: "x", severity: "warn" })).resolves.toBeUndefined();
  });

  it("does nothing when no webhook is configured", async () => {
    delete process.env.STATUS_FEISHU_WEBHOOK_URL;
    delete process.env.STATUS_SLACK_WEBHOOK_URL;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    await notifyOpsAlert({ title: "x", severity: "info" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

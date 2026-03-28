import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AlertChannel,
  type AlertPayload,
  clearChannels,
  getRegisteredChannelNames,
  registerChannel,
  resetErrorCounts,
  sendAlert,
  sendAlertTo,
  setAlertErrorHandler,
  trackError,
  unregisterChannel,
} from "../index.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeMockChannel(name: string): AlertChannel & { calls: AlertPayload[] } {
  const calls: AlertPayload[] = [];
  return {
    name,
    calls,
    send: vi.fn(async (payload: AlertPayload) => {
      calls.push(payload);
      return true;
    }),
  };
}

const basePayload = {
  title: "Test Alert",
  message: "Something happened",
  severity: "info" as const,
};

// ─── Channel Registry ────────────────────────────────────────────────────────

describe("Channel Registry", () => {
  beforeEach(() => clearChannels());

  it("registers a channel", () => {
    registerChannel(makeMockChannel("slack"));
    expect(getRegisteredChannelNames()).toEqual(["slack"]);
  });

  it("unregisters a channel", () => {
    registerChannel(makeMockChannel("slack"));
    unregisterChannel("slack");
    expect(getRegisteredChannelNames()).toEqual([]);
  });

  it("clearChannels removes all channels", () => {
    registerChannel(makeMockChannel("slack"));
    registerChannel(makeMockChannel("discord"));
    clearChannels();
    expect(getRegisteredChannelNames()).toEqual([]);
  });

  it("replaces existing channel with same name on re-register", () => {
    registerChannel(makeMockChannel("slack"));
    registerChannel(makeMockChannel("slack"));
    expect(getRegisteredChannelNames()).toHaveLength(1);
  });
});

// ─── sendAlert ───────────────────────────────────────────────────────────────

describe("sendAlert", () => {
  beforeEach(() => clearChannels());

  it("calls all registered channels", async () => {
    const ch1 = makeMockChannel("slack");
    const ch2 = makeMockChannel("discord");
    registerChannel(ch1);
    registerChannel(ch2);

    await sendAlert(basePayload);

    expect(ch1.send).toHaveBeenCalledOnce();
    expect(ch2.send).toHaveBeenCalledOnce();
  });

  it("returns per-channel success results", async () => {
    registerChannel(makeMockChannel("slack"));
    const results = await sendAlert(basePayload);
    expect(results.get("slack")).toBe(true);
  });

  it("records false for a channel that throws", async () => {
    registerChannel({
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const results = await sendAlert(basePayload);
    expect(results.get("broken")).toBe(false);
  });

  it("auto-enriches payload with timestamp and environment", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);
    await sendAlert(basePayload);

    const received = ch.calls[0];
    expect(received.timestamp).toBeDefined();
    expect(new Date(received.timestamp ?? "").toISOString()).toBe(received.timestamp);
  });
});

// ─── sendAlertTo ─────────────────────────────────────────────────────────────

describe("sendAlertTo", () => {
  beforeEach(() => clearChannels());

  it("only calls the specified channels", async () => {
    const slack = makeMockChannel("slack");
    const discord = makeMockChannel("discord");
    registerChannel(slack);
    registerChannel(discord);

    await sendAlertTo(["slack"], basePayload);

    expect(slack.send).toHaveBeenCalledOnce();
    expect(discord.send).not.toHaveBeenCalled();
  });

  it("returns false for unknown channel name", async () => {
    const results = await sendAlertTo(["nonexistent"], basePayload);
    expect(results.get("nonexistent")).toBe(false);
  });
});

// ─── setAlertErrorHandler ────────────────────────────────────────────────────

describe("setAlertErrorHandler", () => {
  beforeEach(() => clearChannels());

  it("calls error handler when channel.send throws", async () => {
    const handler = vi.fn();
    setAlertErrorHandler(handler);

    registerChannel({
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("boom")),
    });

    await sendAlert(basePayload);
    expect(handler).toHaveBeenCalledWith("Alert channel broken failed", expect.any(Error));

    // Reset to no-op after test
    setAlertErrorHandler(() => {});
  });

  it("default no-op handler does not throw", async () => {
    setAlertErrorHandler(() => {});
    registerChannel({
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("silent")),
    });
    await expect(sendAlert(basePayload)).resolves.not.toThrow();
  });
});

// ─── trackError ──────────────────────────────────────────────────────────────

describe("trackError", () => {
  beforeEach(() => {
    clearChannels();
    resetErrorCounts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const config = { windowMs: 60_000, threshold: 3, cooldownMs: 300_000 };

  it("does not alert below threshold", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    trackError("svc", config); // 1
    trackError("svc", config); // 2
    await vi.runAllTimersAsync();

    expect(ch.send).not.toHaveBeenCalled();
  });

  it("fires alert when threshold is reached", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    trackError("svc", config); // 1
    trackError("svc", config); // 2
    trackError("svc", config); // 3 → threshold
    await vi.runAllTimersAsync();

    expect(ch.send).toHaveBeenCalledOnce();
  });

  it("respects cooldown — does not re-alert within cooldown window", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    // Trigger first alert
    for (let i = 0; i < 3; i++) trackError("svc", config);
    await vi.runAllTimersAsync();
    expect(ch.send).toHaveBeenCalledTimes(1);

    // More errors within cooldown
    for (let i = 0; i < 3; i++) trackError("svc", config);
    await vi.runAllTimersAsync();
    expect(ch.send).toHaveBeenCalledTimes(1); // still 1
  });

  it("resets window after windowMs elapses", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    for (let i = 0; i < 2; i++) trackError("svc", config);
    vi.advanceTimersByTime(config.windowMs + 1);
    // Window resets → these 2 errors are below threshold
    for (let i = 0; i < 2; i++) trackError("svc", config);
    await vi.runAllTimersAsync();

    expect(ch.send).not.toHaveBeenCalled();
  });

  it("tracks separate services independently", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    for (let i = 0; i < 3; i++) trackError("svc-a", config);
    for (let i = 0; i < 3; i++) trackError("svc-b", config);
    await vi.runAllTimersAsync();

    // Two separate alerts (one per service)
    expect(ch.send).toHaveBeenCalledTimes(2);
  });
});

// ─── Convenience Functions ───────────────────────────────────────────────────

describe("Convenience Functions", () => {
  beforeEach(() => clearChannels());

  it("alertInfo sends info severity", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);
    await import("../index.js").then((m) => m.alertInfo("Info", "msg", "svc-info"));
    expect(ch.calls[0].severity).toBe("info");
    expect(ch.calls[0].service).toBe("svc-info");
  });

  it("alertWarning sends warning severity", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);
    await import("../index.js").then((m) => m.alertWarning("Warn", "msg", "svc-warn"));
    expect(ch.calls[0].severity).toBe("warning");
  });

  it("alertError sends error severity", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);
    await import("../index.js").then((m) => m.alertError("Err", "msg", "svc-err"));
    expect(ch.calls[0].severity).toBe("error");
  });

  it("alertCritical sends critical severity", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);
    await import("../index.js").then((m) => m.alertCritical("Crit", "msg", "svc-crit"));
    expect(ch.calls[0].severity).toBe("critical");
  });
});

// ─── Channels & Utilities ────────────────────────────────────────────────────

describe("Channels and Utilities", () => {
  beforeEach(() => {
    clearChannels();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createSlackChannel logic and utility mapping", async () => {
    const fetchMock = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
    } as Response);

    // Use dynamic import to get unexported coverage logic via channel
    const slack = await import("../index.js").then((m) =>
      m.createSlackChannel("http://slack.test"),
    );

    // Testing specific severities to hit getSeverityColor and getSeverityEmoji branches
    await slack.send({ ...basePayload, severity: "info" });
    await slack.send({ ...basePayload, severity: "warning" });
    await slack.send({ ...basePayload, severity: "error" });
    await slack.send({ ...basePayload, severity: "critical" });
    // @ts-expect-error - Testing fallback for unknown severity
    await slack.send({ ...basePayload, severity: "unknown" }); // branch default

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("createSlackChannel handles fetch error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Net Err"));
    const slack = await import("../index.js").then((m) =>
      m.createSlackChannel("http://slack.test"),
    );
    const res = await slack.send(basePayload);
    expect(res).toBe(false);
  });

  it("createDiscordChannel logic and utility mapping", async () => {
    const fetchMock = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
    } as Response);

    const discord = await import("../index.js").then((m) =>
      m.createDiscordChannel("http://discord.test"),
    );

    await discord.send({ ...basePayload, severity: "info" });
    await discord.send({ ...basePayload, severity: "warning" });
    await discord.send({ ...basePayload, severity: "error" });
    await discord.send({ ...basePayload, severity: "critical" });
    // @ts-expect-error - Testing fallback for unknown severity
    await discord.send({ ...basePayload, severity: "unknown" });

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("createDiscordChannel handles fetch error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Net Err"));
    const discord = await import("../index.js").then((m) =>
      m.createDiscordChannel("http://discord.test"),
    );
    const res = await discord.send(basePayload);
    expect(res).toBe(false);
  });

  it("createWebhookChannel logic", async () => {
    const fetchMock = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
    } as Response);

    const webhook = await import("../index.js").then((m) =>
      m.createWebhookChannel("hook", "http://hook.test", {
        headers: { "X-Test": "1" },
        transformPayload: (p) => ({ custom: p.title }),
      }),
    );

    await webhook.send(basePayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://hook.test",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Test": "1" }),
        body: JSON.stringify({ custom: "Test Alert" }),
      }),
    );
  });

  it("createWebhookChannel no transform logic", async () => {
    const fetchMock = vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
    } as Response);

    const webhook = await import("../index.js").then((m) =>
      m.createWebhookChannel("hook", "http://hook.test"),
    );
    await webhook.send(basePayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://hook.test",
      expect.objectContaining({
        body: JSON.stringify(basePayload),
      }),
    );
  });

  it("createWebhookChannel handles fetch error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Net Err"));
    const webhook = await import("../index.js").then((m) =>
      m.createWebhookChannel("hook", "http://hook.test"),
    );
    const res = await webhook.send(basePayload);
    expect(res).toBe(false);
  });
});

// ─── initializeFromEnv ───────────────────────────────────────────────────────

describe("initializeFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    clearChannels();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("registers channels when env vars are present", async () => {
    process.env.SLACK_WEBHOOK_URL = "http://slack";
    process.env.DISCORD_WEBHOOK_URL = "http://discord";

    const { initializeFromEnv, getRegisteredChannelNames } = await import("../index.js");
    const registered = initializeFromEnv();

    expect(registered).toContain("slack");
    expect(registered).toContain("discord");
    expect(getRegisteredChannelNames()).toEqual(["slack", "discord"]);
  });

  it("does nothing when env vars are missing", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;

    const { initializeFromEnv, getRegisteredChannelNames } = await import("../index.js");
    const registered = initializeFromEnv();

    expect(registered).toHaveLength(0);
    expect(getRegisteredChannelNames()).toHaveLength(0);
  });
});

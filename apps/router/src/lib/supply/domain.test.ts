import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nebutra/audit", () => ({
  auditLogger: () => ({ log: vi.fn().mockResolvedValue(undefined) }),
}));

const { AdminManifestSchema } = await import("@nebutra/contracts/admin");
const { ROUTER_ADMIN_MANIFEST } = await import("../admin/manifest");
const { applyChannelSync, listAccounts, planChannelSync, readSignal } = await import("./domain");

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/** Engines stub: CLIProxyAPI serves 3 models; New-API channel lists 2 (one stale). */
function engines(channelModels = "gpt-5,old-model") {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (url.endsWith("/v1/models") && url.includes("8317"))
      return json({ data: [{ id: "gpt-5" }, { id: "gpt-5-codex" }, { id: "gemini-3-pro" }] });
    if (url.endsWith("/auth-files")) {
      return json({
        files: [
          {
            id: "a1",
            provider: "codex",
            email: "dev@example.com",
            status: "ok",
            recent_requests: 12,
          },
          {
            id: "a2",
            provider: "antigravity",
            email: "ops@example.com",
            status: "expired",
            status_message: "refresh token rejected",
          },
        ],
      });
    }
    if (url.endsWith("/api/user/login"))
      return json(
        { success: true, data: { id: 7 } },
        { headers: { "set-cookie": "session=s; Path=/", "content-type": "application/json" } },
      );
    if (url.includes("/api/channel/search"))
      return json({
        success: true,
        data: { items: [{ id: 42, name: "cliproxyapi", models: channelModels }] },
      });
    if (url.includes("/api/status")) return json({ success: true });
    return json({ success: true });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

describe("router admin manifest", () => {
  it("is a valid nebutra.admin/v1 document with a supply domain", () => {
    const parsed = AdminManifestSchema.parse(ROUTER_ADMIN_MANIFEST);
    const supply = parsed.domains.find((d) => d.id === "supply");
    expect(supply?.actions.map((a) => a.id)).toEqual([
      "account.login",
      "account.login.callback",
      "channel.sync",
      "price.publish",
    ]);
    expect(supply?.signals.map((s) => s.id)).toEqual([
      "engine.down",
      "channel.drift",
      "account.expired",
    ]);
    expect(supply?.actions.every((a) => a.role === "platform_operator")).toBe(true);
    expect(supply?.resources.map((r) => r.id)).toEqual(["engine", "account", "login", "shelf"]);
  });
});

describe("supply domain", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.CLIPROXY_API_KEY = "k";
    process.env.CLIPROXY_MANAGEMENT_KEY = "m";
    process.env.NEW_API_ROOT_PASSWORD = "pw";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("maps auth files to account rows with a normalised status", async () => {
    const { fetchImpl } = engines();
    const list = await listAccounts(fetchImpl);
    expect(list.total).toBe(2);
    expect(list.items[0]).toMatchObject({
      provider: "codex",
      account: "dev@example.com",
      status: "healthy",
      requests: 12,
    });
    expect(list.items[1]).toMatchObject({ status: "expired", detail: "refresh token rejected" });
    expect(list.probedAt).toBeTruthy();
  });

  it("plans a channel sync as a diff and applies only with that plan", async () => {
    const { fetchImpl, calls } = engines();
    const plan = await planChannelSync(fetchImpl);
    expect(plan.diff).toEqual([
      { op: "add", path: "channel.models.gemini-3-pro", to: "gemini-3-pro" },
      { op: "add", path: "channel.models.gpt-5-codex", to: "gpt-5-codex" },
      { op: "remove", path: "channel.models.old-model", from: "old-model" },
    ]);
    expect(plan.summary).toContain("+2 −1");
    expect(calls.some((c) => c.method === "PUT")).toBe(false);

    const caller = { userId: "u1", role: "platform_operator" as const };
    const result = await applyChannelSync(
      plan.planId,
      caller,
      new Request("https://router/x"),
      fetchImpl,
    );
    expect("auditId" in result && result.auditId).toBeTruthy();
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.body).toMatchObject({
      id: 42,
      name: "cliproxyapi",
      models: "gemini-3-pro,gpt-5,gpt-5-codex",
    });

    const again = await applyChannelSync(
      plan.planId,
      caller,
      new Request("https://router/x"),
      fetchImpl,
    );
    expect(again).toEqual({ expired: true });
  });

  it("raises channel.drift and account.expired from probes, never from config", async () => {
    const { fetchImpl } = engines();
    const drift = await readSignal("channel.drift", fetchImpl);
    expect(drift).toMatchObject({
      status: "raised",
      action: "channel.sync",
      data: { add: ["gemini-3-pro", "gpt-5-codex"] },
    });
    expect(drift?.probedAt).toBeTruthy();

    const inSync = await readSignal(
      "channel.drift",
      engines("gemini-3-pro,gpt-5,gpt-5-codex").fetchImpl,
    );
    expect(inSync?.status).toBe("ok");

    const expired = await readSignal("account.expired", fetchImpl);
    expect(expired).toMatchObject({ status: "raised", title: "1 account need re-login" });
    expect(await readSignal("nope", fetchImpl)).toBeNull();
  });

  it("marks a signal unknown when the probe itself fails", async () => {
    delete process.env.NEW_API_ROOT_PASSWORD;
    const reading = await readSignal("channel.drift", engines().fetchImpl);
    expect(reading?.status).toBe("unknown");
  });
});

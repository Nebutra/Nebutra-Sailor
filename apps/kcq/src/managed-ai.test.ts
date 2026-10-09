import { describe, expect, it, vi } from "vitest";
import { createManagedAiClient, ManagedAiError, managedAiFetch } from "./managed-ai";

describe("managed AI client", () => {
  it("uses the session cookie, drops any bearer placeholder and never sends a model", async () => {
    const upstream = vi.fn<typeof fetch>(async () =>
      Response.json({ choices: [{ message: { content: "你好" } }] }),
    );
    const client = createManagedAiClient("https://kcq.nebutra.com/", upstream);
    expect(await client.complete([{ role: "user", content: "hi" }])).toBe("你好");
    const [url, init] = upstream.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://kcq.nebutra.com/market/ai/v1/chat/completions");
    expect(init?.credentials).toBe("same-origin");
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("model");
  });

  it("strips Authorization when used as a provider fetch", async () => {
    const upstream = vi.fn<typeof fetch>(async () => new Response("{}"));
    await managedAiFetch(upstream)("https://x/y", {
      headers: { Authorization: "Bearer nebutra-session" },
    });
    expect(new Headers(upstream.mock.calls[0]?.[1]?.headers).get("Authorization")).toBeNull();
  });

  it("lists the model this account is served with", async () => {
    const client = createManagedAiClient("https://kcq.nebutra.com", async () =>
      Response.json({ object: "list", data: [{ id: "gpt-5.6-luna" }, { nope: 1 }] }),
    );
    expect(await client.listModels()).toEqual([{ id: "gpt-5.6-luna" }]);
  });

  it("surfaces the gateway error envelope", async () => {
    const client = createManagedAiClient("https://kcq.nebutra.com", async () =>
      Response.json({ error: { message: "请先登录。", code: "unauthenticated" } }, { status: 401 }),
    );
    await expect(client.complete([{ role: "user", content: "x" }])).rejects.toMatchObject({
      status: 401,
      code: "unauthenticated",
      message: "请先登录。",
    });
    await expect(client.listModels()).rejects.toBeInstanceOf(ManagedAiError);
  });

  it("names the active workspace so its KCQ wallet pays, and surfaces a 402", async () => {
    const upstream = vi.fn(async (..._args: Parameters<typeof fetch>) =>
      Response.json(
        { error: { message: "KCQ 余额不足，请充值后继续使用 AI。", code: "insufficient_balance" } },
        { status: 402 },
      ),
    );
    const client = createManagedAiClient(
      "https://kcq.nebutra.com",
      upstream as typeof fetch,
      "org_1",
    );
    await expect(client.complete([{ role: "user", content: "x" }])).rejects.toMatchObject({
      status: 402,
      code: "insufficient_balance",
    });
    expect(new Headers(upstream.mock.calls[0]?.[1]?.headers).get("X-KCQ-Workspace")).toBe("org_1");
  });

  it("tells the host when the wallet cannot cover a call, and still returns the response", async () => {
    const hear = vi.fn();
    const upstream = vi.fn<typeof fetch>(async () =>
      Response.json({ error: { code: "insufficient_balance" } }, { status: 402 }),
    );
    const response = await managedAiFetch(upstream, "org_1", { onInsufficientBalance: hear })(
      "https://x/y",
    );
    expect(response.status).toBe(402);
    expect(hear).toHaveBeenCalledTimes(1);
    const fine = managedAiFetch(async () => new Response("{}", { status: 200 }), "org_1", {
      onInsufficientBalance: hear,
    });
    await fine("https://x/y");
    expect(hear).toHaveBeenCalledTimes(1);
  });

  it("reads the wallet of the named workspace", async () => {
    const upstream = vi.fn(async (..._args: Parameters<typeof fetch>) =>
      Response.json({ internal: false, balance: 2, currency: "USD", usage: [] }),
    );
    const client = createManagedAiClient(
      "https://kcq.nebutra.com",
      upstream as typeof fetch,
      "org_1",
    );
    expect(await client.getWallet()).toMatchObject({ status: "ready", balance: 2 });
    expect(String(upstream.mock.calls[0]?.[0])).toBe("https://kcq.nebutra.com/market/ai/v1/wallet");
    expect(new Headers(upstream.mock.calls[0]?.[1]?.headers).get("X-KCQ-Workspace")).toBe("org_1");
  });
});

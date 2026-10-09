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
});

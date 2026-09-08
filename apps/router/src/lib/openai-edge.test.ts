import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type EdgeUsage,
  extractCredential,
  isAllowedEdgePath,
  isRouterSupplyConfigured,
  openaiError,
  parseUsage,
  proxyOpenAiCompatible,
  RouterSupplyUnavailableError,
  requireRouterSupply,
} from "./openai-edge";

const identity = { keyId: "key_1", tenantId: "tenant_1", userId: "user_1" };

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

function sseResponse(frames: string[]) {
  const text = frames.map((f) => `data: ${f}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(text, { status: 200, headers: { "content-type": "text/event-stream" } });
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("router OpenAI edge", () => {
  const keys = ["NEW_API_BASE_URL", "NEBUTRA_NEW_API_URL", "NEW_API_ACCESS_TOKEN"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it("fails closed without New-API", () => {
    delete process.env.NEW_API_BASE_URL;
    delete process.env.NEBUTRA_NEW_API_URL;
    expect(isRouterSupplyConfigured()).toBe(false);
    expect(() => requireRouterSupply()).toThrow(RouterSupplyUnavailableError);
  });

  it("rejects a request with no router key", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/models"),
      ["models"],
    );
    expect(response.status).toBe(401);
  });

  it("reads the same credential from Bearer or x-api-key", () => {
    expect(
      extractCredential(new Request("https://r/", { headers: { Authorization: "Bearer sk-a" } })),
    ).toBe("sk-a");
    expect(extractCredential(new Request("https://r/", { headers: { "x-api-key": "sk-b" } }))).toBe(
      "sk-b",
    );
    expect(extractCredential(new Request("https://r/"))).toBeNull();
  });

  it("exposes only the product surface under /v1", () => {
    for (const ok of [
      ["chat", "completions"],
      ["responses"],
      ["messages"],
      ["messages", "count_tokens"],
      ["models"],
      ["images", "edits"],
      ["embeddings"],
    ]) {
      expect(isAllowedEdgePath(ok), ok.join("/")).toBe(true);
    }
    for (const bad of [["admin"], ["api", "channel"], ["dashboard"], ["v1", "models"], []]) {
      expect(isAllowedEdgePath(bad), bad.join("/")).toBe(false);
    }
  });

  it("returns 404 for a path outside the surface before touching upstream", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const fetchImpl = vi.fn();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/api/channel", {
        headers: { Authorization: "Bearer sk-x" },
      }),
      ["api", "channel"],
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(response.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("forwards 302.ai image-edit multipart to New-API unchanged (legacy token mode)", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const body = new FormData();
    body.set("model", "gpt-image-2");
    body.set("prompt", "keep the same person");
    body.set("size", "1024x1536");
    body.set("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "portrait.png");

    const fetchImpl: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://127.0.0.1:3001/v1/images/edits");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-router-product");
      expect(new Headers(init?.headers).get("content-type")).toMatch(/multipart\/form-data/);
      expect(init?.body).toBeTruthy();
      return jsonResponse({ data: [{ b64_json: "QQ==" }] });
    });

    const request = new Request("https://router.nebutra.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer sk-router-product" },
      body,
    });
    const response = await proxyOpenAiCompatible(request, ["images", "edits"], fetchImpl);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    const payload = (await response.json()) as { data: Array<{ b64_json: string }> };
    expect(payload.data[0]?.b64_json).toBe("QQ==");
  });

  it("swaps a Nebutra key for the internal token and passes Anthropic headers", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const fetchImpl: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      expect(String(input)).toBe("http://127.0.0.1:3001/v1/messages");
      expect(h.get("authorization")).toBe("Bearer newapi-internal");
      expect(h.get("anthropic-version")).toBe("2023-06-01");
      expect(h.get("anthropic-beta")).toBe("prompt-caching-2024-07-31");
      expect(h.get("x-api-key")).toBeNull();
      expect(h.get("cookie")).toBeNull();
      return jsonResponse({
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 12, output_tokens: 3 },
      });
    });
    const usages: EdgeUsage[] = [];
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": "sk-sailor-customer",
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
          cookie: "session=leak",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 8, messages: [] }),
      }),
      ["messages"],
      {
        fetchImpl,
        resolveKey: async (k) => (k === "sk-sailor-customer" ? identity : null),
        upstreamToken: "newapi-internal",
        onUsage: (u) => {
          usages.push(u);
        },
      },
    );
    expect(response.status).toBe(200);
    await response.text();
    await flush();
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      identity,
      path: "messages",
      model: "claude-sonnet-4-5",
      promptTokens: 12,
      completionTokens: 3,
      totalTokens: 15,
      status: 200,
    });
  });

  it("rejects an unknown or revoked Nebutra key with 401 and never calls upstream", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const fetchImpl = vi.fn();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/models", {
        headers: { Authorization: "Bearer sk-sailor-revoked" },
      }),
      ["models"],
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        resolveKey: async () => null,
        upstreamToken: "newapi-internal",
      },
    );
    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when the internal token is missing in nebutra mode", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    delete process.env.NEW_API_ACCESS_TOKEN;
    await expect(
      proxyOpenAiCompatible(
        new Request("https://router.nebutra.com/v1/models", {
          headers: { Authorization: "Bearer sk-sailor-ok" },
        }),
        ["models"],
        { fetchImpl: vi.fn() as unknown as typeof fetch, resolveKey: async () => identity },
      ),
    ).rejects.toBeInstanceOf(RouterSupplyUnavailableError);
  });

  it("extracts usage from a streamed chat completion without altering the bytes", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const frames = [
      JSON.stringify({ id: "c1", model: "gpt-5", choices: [{ delta: { content: "hi" } }] }),
      JSON.stringify({
        id: "c1",
        model: "gpt-5",
        choices: [],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      }),
    ];
    const fetchImpl: typeof fetch = vi.fn(async () => sseResponse(frames));
    const usages: EdgeUsage[] = [];
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer sk-sailor-customer", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-5", stream: true, messages: [] }),
      }),
      ["chat", "completions"],
      {
        fetchImpl,
        resolveKey: async () => identity,
        upstreamToken: "t",
        onUsage: (u) => {
          usages.push(u);
        },
      },
    );
    const text = await response.text();
    expect(text).toContain("data: [DONE]");
    expect(text.split("data:").length).toBe(4);
    await flush();
    expect(usages[0]).toMatchObject({
      model: "gpt-5",
      promptTokens: 5,
      completionTokens: 2,
      totalTokens: 7,
    });
  });

  it("parses Responses API and Anthropic stream usage shapes", () => {
    const responses = [
      `data: ${JSON.stringify({ type: "response.created", response: { model: "gpt-5-codex" } })}`,
      `data: ${JSON.stringify({ type: "response.completed", response: { model: "gpt-5-codex", usage: { input_tokens: 40, output_tokens: 10, total_tokens: 50 } } })}`,
    ].join("\n\n");
    expect(parseUsage(responses, "text/event-stream")).toEqual({
      model: "gpt-5-codex",
      promptTokens: 40,
      completionTokens: 10,
      totalTokens: 50,
    });

    const anthropic = [
      `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { model: "claude-sonnet-4-5", usage: { input_tokens: 20, output_tokens: 1 } } })}`,
      `event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", usage: { output_tokens: 9 } })}`,
    ].join("\n\n");
    expect(parseUsage(anthropic, "text/event-stream")).toEqual({
      model: "claude-sonnet-4-5",
      promptTokens: 20,
      completionTokens: 9,
      totalTokens: 29,
    });

    expect(parseUsage("not json", "application/json").totalTokens).toBe(0);
  });

  it("shapes errors like the OpenAI / 302.ai envelope", async () => {
    const response = openaiError(503, "router_unconfigured");
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { message: "router_unconfigured", type: "server_error" },
    });
  });
});

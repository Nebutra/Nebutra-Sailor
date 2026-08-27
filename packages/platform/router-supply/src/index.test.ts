import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ALIASES, parseAliasTableJson, resolveAliases } from "./alias";
import { chatCompletionsUrl } from "./engines";
import { proxyChatCompletions } from "./proxy";
import { resolveUpstreamChain, toOpenAiModelList } from "./resolve";

describe("alias table", () => {
  it("resolves public model to ordered engines", () => {
    const table = parseAliasTableJson(undefined);
    const rows = resolveAliases(table, "claude-sonnet-5");
    expect(rows[0]?.engineId).toBe("newapi");
    expect(rows.some((r) => r.engineId === "sub2api")).toBe(true);
  });

  it("lists public models for /v1/models", () => {
    const list = toOpenAiModelList({ entries: DEFAULT_ALIASES });
    expect(list.object).toBe("list");
    expect(list.data.some((m) => m.id === "gpt-5.6-luna")).toBe(true);
    expect(list.data.some((m) => m.id === "claude-sonnet-5")).toBe(true);
    expect(list.data.some((m) => m.id === "gemini-3.6-flash")).toBe(true);
    // retired product lines must not be the default catalog face
    expect(list.data.some((m) => m.id === "gpt-4o-mini")).toBe(false);
    expect(list.data.some((m) => m.id === "gpt-5.4-mini")).toBe(false);
    expect(list.data.some((m) => m.id === "claude-sonnet-4.6")).toBe(false);
    expect(list.data.some((m) => m.id === "gpt-3.5-turbo")).toBe(false);
  });
});

describe("chatCompletionsUrl", () => {
  it("normalizes base paths", () => {
    expect(chatCompletionsUrl("http://127.0.0.1:3001")).toBe(
      "http://127.0.0.1:3001/v1/chat/completions",
    );
    expect(chatCompletionsUrl("http://127.0.0.1:3001/v1/")).toBe(
      "http://127.0.0.1:3001/v1/chat/completions",
    );
  });
});

describe("resolveUpstreamChain", () => {
  it("builds targets when engines present", () => {
    const targets = resolveUpstreamChain({
      publicModel: "gpt-5.6-luna",
      requestId: "req_1",
      aliases: { entries: DEFAULT_ALIASES },
      engines: [
        {
          id: "newapi",
          kind: "newapi",
          baseUrl: "http://127.0.0.1:3001",
          enabled: true,
          apiKey: "tok",
        },
      ],
    });
    // specific alias + wildcard "*" fallback row
    expect(targets.length).toBeGreaterThanOrEqual(1);
    expect(targets[0]?.url).toContain("/chat/completions");
    expect(targets[0]?.headers.Authorization).toBe("Bearer tok");
    expect(targets[0]?.engineId).toBe("newapi");
  });
});

describe("proxyChatCompletions", () => {
  it("falls back to second target on 503", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await proxyChatCompletions({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      body: { model: "gpt-5.6-luna", messages: [] },
      targets: [
        {
          engineId: "a",
          kind: "newapi",
          url: "http://a/v1/chat/completions",
          headers: { Authorization: "Bearer a" },
          upstreamModel: "gpt-5.6-luna",
        },
        {
          engineId: "b",
          kind: "newapi",
          url: "http://b/v1/chat/completions",
          headers: { Authorization: "Bearer b" },
          upstreamModel: "gpt-5.6-luna",
        },
      ],
    });
    expect(result.target.engineId).toBe("b");
    expect(result.attempts).toBe(2);
  });
});

/**
 * Fallback wiring — verifies that the multi-provider fallback chain is
 * actually integrated into:
 *
 *   1. `VercelAIAgent.execute()` — chat path via `streamText`
 *   2. `embed()` / `embedMany()` — embedding path
 *
 * The AI SDK + provider SDKs are mocked so no network traffic occurs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetAgentsEnvCache } from "../env";
import { filterAvailableProviders, runEmbedWithFallback, runWithFallback } from "../fallback";

// ─── Mock the dynamically-imported provider SDKs ─────────────────────────────
// We mock at the module level so any `await import("@ai-sdk/...")` inside
// `buildModel()` / `buildEmbeddingModel()` returns a deterministic stub.

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => ({
    chat: vi.fn((id: string) => ({ __provider: "openrouter", __id: id })),
    textEmbeddingModel: vi.fn((id: string) => ({
      __provider: "openrouter",
      __id: id,
      __kind: "embedding",
    })),
  })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() =>
    Object.assign((id: string) => ({ __provider: "anthropic", __id: id }), {
      __provider: "anthropic",
    }),
  ),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    Object.assign((id: string) => ({ __provider: "openai", __id: id }), {
      __provider: "openai",
      textEmbeddingModel: vi.fn((id: string) => ({
        __provider: "openai",
        __id: id,
        __kind: "embedding",
      })),
    }),
  ),
}));

// ─── filterAvailableProviders ───────────────────────────────────────────────

describe("filterAvailableProviders()", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
  });

  it("filters out providers whose API key is missing", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const out = filterAvailableProviders(["openrouter", "anthropic", "openai"]);
    expect(out).toEqual(["openrouter"]);
  });

  it("returns the original chain when NO providers have keys (avoid empty)", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const out = filterAvailableProviders(["openrouter", "anthropic"]);
    expect(out).toEqual(["openrouter", "anthropic"]);
  });
});

// ─── Single-provider config: backward compatibility ──────────────────────────

describe("runWithFallback — single-provider config", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    // Anthropic + OpenAI deliberately missing — chain should be filtered
    // down to just openrouter.
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
  });

  it("does not rotate when only one provider key is present", async () => {
    let calls = 0;
    const result = await runWithFallback(
      async () => {
        calls += 1;
        return "ok" as const;
      },
      { chain: ["openrouter", "anthropic", "openai"] },
    );

    expect(result.result).toBe("ok");
    expect(result.attempts).toBe(1);
    expect(result.provider).toBe("openrouter");
    expect(calls).toBe(1);
  });
});

// ─── Embedding fallback rotation ─────────────────────────────────────────────

describe("runEmbedWithFallback()", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("OPENAI_API_KEY", "oa-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
  });

  it("rotates to the next embedding provider on retryable error", async () => {
    let calls = 0;
    const result = await runEmbedWithFallback(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw Object.assign(new Error("Rate Limited"), { statusCode: 429 });
        }
        return { embeddings: [[0.1, 0.2]] } as const;
      },
      { chain: ["openrouter", "openai"] },
    );

    expect(calls).toBe(2);
    expect(result.attempts).toBe(2);
    expect(result.provider).toBe("openai");
  });

  it("excludes anthropic from the embedding chain (no embedding API)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "an-key");

    const seenProviders: string[] = [];
    let calls = 0;

    await expect(
      runEmbedWithFallback(
        async () => {
          calls += 1;
          // Capture which provider key was used by checking the env state
          // via the call ordering — we don't have direct access here, so we
          // just throw retryable to force walking the chain.
          throw Object.assign(new Error("503"), { statusCode: 503 });
        },
        // Even if the user includes anthropic, it's filtered out:
        { chain: ["anthropic", "openrouter", "openai"] },
      ),
    ).rejects.toThrow(/All embedding providers/);

    // Should only attempt openrouter + openai (anthropic filtered out)
    expect(calls).toBe(2);
    void seenProviders;
  });

  it("throws a clear error when no embedding-capable provider has a key", async () => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
    vi.stubEnv("ANTHROPIC_API_KEY", "an-key");
    // No openrouter or openai key

    await expect(
      runEmbedWithFallback(async () => ({ ok: true }), {
        chain: ["openrouter", "openai", "anthropic"],
      }),
    ).rejects.toThrow(/No embedding-capable providers available/);
  });

  it("rethrows non-retryable errors immediately", async () => {
    let calls = 0;
    await expect(
      runEmbedWithFallback(
        async () => {
          calls += 1;
          throw Object.assign(new Error("Bad Request"), { statusCode: 400 });
        },
        { chain: ["openrouter", "openai"] },
      ),
    ).rejects.toThrow(/Bad Request/);
    expect(calls).toBe(1);
  });
});

// ─── VercelAIAgent.execute() rotates providers on retryable error ────────────

describe("VercelAIAgent.execute() — fallback wiring", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
    vi.resetModules();
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "an-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
    vi.resetModules();
  });

  it("rotates to the next provider when streamText fails with a retryable error", async () => {
    let streamCalls = 0;

    // Dynamic mock of `ai` — use vi.doMock so it applies to subsequent imports.
    vi.doMock("ai", () => ({
      streamText: vi.fn(() => {
        streamCalls += 1;
        if (streamCalls === 1) {
          // Return an object whose .text promise rejects with a retryable error
          return {
            text: Promise.reject(
              Object.assign(new Error("503 Service Unavailable"), {
                statusCode: 503,
              }),
            ),
            usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
          };
        }
        return {
          text: Promise.resolve("hello from fallback"),
          usage: Promise.resolve({ inputTokens: 10, outputTokens: 5 }),
        };
      }),
      stepCountIs: vi.fn((n: number) => n),
      dynamicTool: vi.fn((d: unknown) => d),
    }));

    // Avoid real billing/credit deduction
    vi.doMock("@nebutra/billing/credits", () => ({
      deductCredits: vi.fn(async () => {}),
    }));

    const { VercelAIAgent } = await import("../providers/vercel-ai");
    const agent = new VercelAIAgent({
      id: "test",
      name: "Test",
      description: "",
      model: "flagship",
      instructions: "be helpful",
    });

    const response = await agent.run([{ role: "user", content: "hi", timestamp: new Date() }], {
      tenantId: "org_1",
      userId: "u_1",
      conversationId: "c_1",
    });

    expect(streamCalls).toBe(2);
    expect(response.messages.at(-1)?.content).toBe("hello from fallback");
    expect(response.usage.totalTokens).toBe(15);
  });

  it("does not rotate when the only configured provider succeeds (single-provider deploy)", async () => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
    vi.resetModules();
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    // Anthropic + OpenAI deliberately absent

    let streamCalls = 0;
    vi.doMock("ai", () => ({
      streamText: vi.fn(() => {
        streamCalls += 1;
        return {
          text: Promise.resolve("ok"),
          usage: Promise.resolve({ inputTokens: 1, outputTokens: 1 }),
        };
      }),
      stepCountIs: vi.fn((n: number) => n),
      dynamicTool: vi.fn((d: unknown) => d),
    }));
    vi.doMock("@nebutra/billing/credits", () => ({
      deductCredits: vi.fn(async () => {}),
    }));

    const { VercelAIAgent } = await import("../providers/vercel-ai");
    const agent = new VercelAIAgent({
      id: "single",
      name: "Single",
      description: "",
      model: "flagship",
      instructions: "x",
    });

    const response = await agent.run([{ role: "user", content: "ping", timestamp: new Date() }], {
      tenantId: "t",
      userId: "u",
      conversationId: "c",
    });

    expect(streamCalls).toBe(1);
    expect(response.messages.at(-1)?.content).toBe("ok");
  });
});

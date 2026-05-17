import type { LLMProvider } from "@nebutra/provider-registry";
import { describe, expect, it } from "vitest";
import { LlmGateway } from "./index";

function provider(id: string, text: string, fail = false): LLMProvider {
  return {
    id,
    model: id,
    capabilities: new Set(["reasoning", "tools"]),
    async complete() {
      if (fail) throw new Error("temporary");
      return {
        id: `${id}-call`,
        provider: id,
        model: id,
        text,
        usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
      };
    },
    async doctor() {
      return { provider: id, ok: !fail };
    },
  };
}

describe("LlmGateway", () => {
  it("routes by capability and records usage", async () => {
    const gateway = new LlmGateway({ providers: [provider("local", "hello")] });
    const response = await gateway.complete({
      capability: "reasoning+tools",
      budgetUsd: 0.05,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.text).toBe("hello");
    expect(gateway.usageReport().calls).toBe(1);
    expect(gateway.debugLog()[0]?.decision.reason).toContain("capability");
  });

  it("falls back when the primary provider fails", async () => {
    const gateway = new LlmGateway({
      providers: [provider("primary", "no", true), provider("fallback", "yes")],
    });

    await expect(
      gateway.complete({
        capability: "reasoning",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toMatchObject({ provider: "fallback", text: "yes" });
  });

  it("uses a prefix cache for stable prompts", async () => {
    const gateway = new LlmGateway({ providers: [provider("local", "cached")] });
    const request = {
      capability: "reasoning",
      messages: [{ role: "user" as const, content: "hi" }],
    };

    await gateway.complete(request);
    await gateway.complete(request);

    expect(gateway.cacheStats()).toMatchObject({ hits: 1, misses: 1 });
  });
});

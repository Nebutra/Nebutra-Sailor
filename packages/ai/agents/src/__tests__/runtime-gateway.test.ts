import { describe, expect, it } from "vitest";
import { AgentRuntimeGateway, type AgentRuntimeGatewayProvider } from "../gateway";

function provider(
  id: string,
  text: string,
  options: {
    capabilities?: readonly string[];
    fail?: "retryable" | "fatal";
    calls?: { count: number };
  } = {},
): AgentRuntimeGatewayProvider {
  return {
    id,
    model: `${id}-model`,
    capabilities: new Set(options.capabilities ?? ["reasoning", "tools"]),
    async complete() {
      if (options.calls) options.calls.count += 1;
      if (options.fail === "retryable") {
        throw Object.assign(new Error("rate limited"), { statusCode: 429 });
      }
      if (options.fail === "fatal") {
        throw Object.assign(new Error("unauthorized"), { statusCode: 401 });
      }
      return {
        id: `${id}-call`,
        model: `${id}-model`,
        provider: id,
        text,
        usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
      };
    },
  };
}

describe("AgentRuntimeGateway", () => {
  it("routes by capability and records tenant-aware usage decisions", async () => {
    const gateway = new AgentRuntimeGateway({
      providers: [
        provider("vision-only", "no", { capabilities: ["vision"] }),
        provider("reasoning-tools", "hello", { capabilities: ["reasoning", "tools"] }),
      ],
    });

    const response = await gateway.complete({
      capability: "reasoning+tools",
      tenantId: "org_1",
      userId: "user_1",
      requestId: "req_1",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.text).toBe("hello");
    expect(gateway.usageReport()).toMatchObject({ calls: 1, totalTokens: 5 });
    expect(gateway.debugLog()[0]).toMatchObject({
      requestId: "req_1",
      tenantId: "org_1",
      userId: "user_1",
      decision: {
        provider: "reasoning-tools",
        fallbackIndex: 0,
      },
      ok: true,
    });
  });

  it("falls back only for retryable provider errors", async () => {
    const retryable = new AgentRuntimeGateway({
      providers: [provider("primary", "no", { fail: "retryable" }), provider("fallback", "yes")],
    });

    await expect(
      retryable.complete({
        capability: "reasoning",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toMatchObject({ provider: "fallback", text: "yes" });

    const fatal = new AgentRuntimeGateway({
      providers: [provider("primary", "no", { fail: "fatal" }), provider("fallback", "yes")],
    });

    await expect(
      fatal.complete({
        capability: "reasoning",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/unauthorized/);
    expect(fatal.debugLog()).toHaveLength(1);
  });

  it("uses a stable prompt cache without invoking the provider twice", async () => {
    const calls = { count: 0 };
    const gateway = new AgentRuntimeGateway({
      providers: [provider("primary", "cached", { calls })],
    });
    const request = {
      capability: "reasoning",
      messages: [{ role: "user" as const, content: "same prompt" }],
    };

    await gateway.complete(request);
    await gateway.complete(request);

    expect(calls.count).toBe(1);
    expect(gateway.cacheStats()).toMatchObject({ hits: 1, misses: 1, size: 1 });
  });
});

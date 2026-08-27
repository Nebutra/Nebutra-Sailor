/**
 * Cost & observability primitives:
 * - Anthropic prompt cache control wiring
 * - Multi-provider fallback chain on retryable errors
 * - Langfuse no-op when env missing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetAgentsEnvCache } from "../env";
import {
  buildSystemWithCache,
  isRetryableError,
  runWithFallback,
  withAnthropicCacheControl,
} from "../fallback";
import { _resetLangfuseCache, buildTelemetryConfig, initLangfuse } from "../observability";

describe("withAnthropicCacheControl()", () => {
  it("returns ephemeral cache control under the anthropic provider key", () => {
    const opts = withAnthropicCacheControl();
    expect(opts.anthropic.cacheControl.type).toBe("ephemeral");
  });

  it("wraps a system prompt with cache-control providerOptions", () => {
    const wrapped = buildSystemWithCache("You are a helpful assistant.");
    expect(wrapped.role).toBe("system");
    expect(wrapped.content).toBe("You are a helpful assistant.");
    expect(wrapped.providerOptions.anthropic.cacheControl.type).toBe("ephemeral");
  });
});

describe("isRetryableError()", () => {
  it.each([429, 500, 502, 503, 504, 408])("marks status %i as retryable", (statusCode: number) => {
    expect(isRetryableError({ statusCode })).toBe(true);
  });

  it("marks ECONNRESET / ETIMEDOUT as retryable", () => {
    expect(isRetryableError({ code: "ECONNRESET" })).toBe(true);
    expect(isRetryableError({ code: "ETIMEDOUT" })).toBe(true);
  });

  it("marks 4xx auth/validation errors as non-retryable", () => {
    expect(isRetryableError({ statusCode: 401 })).toBe(false);
    expect(isRetryableError({ statusCode: 403 })).toBe(false);
    expect(isRetryableError({ statusCode: 400 })).toBe(false);
  });

  it("returns false for null / undefined / non-objects", () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
    expect(isRetryableError("oops")).toBe(false);
  });

  it("respects an explicit isRetryable=true flag (AI SDK APICallError)", () => {
    expect(isRetryableError({ isRetryable: true })).toBe(true);
  });
});

describe("runWithFallback()", () => {
  beforeEach(() => {
    _resetAgentsEnvCache();
    // Provide stub keys so buildModel() doesn't throw before invoke() runs.
    vi.stubEnv("OPENROUTER_API_KEY", "test-or");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-an");
    vi.stubEnv("OPENAI_API_KEY", "test-oa");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls through retryable errors and returns the next provider's result", async () => {
    let calls = 0;
    const result = await runWithFallback(
      async () => {
        calls += 1;
        if (calls === 1) {
          // simulate primary provider 503
          const err = Object.assign(new Error("Service Unavailable"), {
            statusCode: 503,
          });
          throw err;
        }
        return "ok-from-fallback" as const;
      },
      {
        chain: ["openrouter", "anthropic"],
        // Stub buildModel by injecting fake creds via env
        model: "flagship",
      },
    );

    expect(result.result).toBe("ok-from-fallback");
    expect(result.attempts).toBe(2);
    expect(result.provider).toBe("anthropic");
  });

  it("rethrows non-retryable errors immediately (no fallback)", async () => {
    let calls = 0;
    await expect(
      runWithFallback(
        async () => {
          calls += 1;
          throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
        },
        { chain: ["openrouter", "anthropic"] },
      ),
    ).rejects.toThrow(/Unauthorized/);
    expect(calls).toBe(1);
  });

  it("throws an aggregate error when the entire chain fails with retryables", async () => {
    await expect(
      runWithFallback(
        async () => {
          throw Object.assign(new Error("503"), { statusCode: 503 });
        },
        { chain: ["openrouter", "anthropic", "openai"] },
      ),
    ).rejects.toThrow(/All LLM providers in fallback chain/);
  });
});

describe("Langfuse telemetry — no-op when env missing", () => {
  beforeEach(() => {
    _resetLangfuseCache();
    _resetAgentsEnvCache();
    vi.unstubAllEnvs();
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", "");
    vi.stubEnv("LANGFUSE_SECRET_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetLangfuseCache();
    _resetAgentsEnvCache();
  });

  it("initLangfuse() returns null when keys missing", async () => {
    const client = await initLangfuse();
    expect(client).toBeNull();
  });

  it("buildTelemetryConfig() returns isEnabled=false when keys missing", () => {
    const cfg = buildTelemetryConfig({ functionId: "test-fn" });
    expect(cfg.isEnabled).toBe(false);
    expect(cfg.functionId).toBeUndefined();
  });

  it("buildTelemetryConfig() includes tenant/session metadata when configured", () => {
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", "pk-test");
    vi.stubEnv("LANGFUSE_SECRET_KEY", "sk-test");
    _resetAgentsEnvCache();

    const cfg = buildTelemetryConfig({
      functionId: "agent.support-bot",
      metadata: {
        tenantId: "org_123",
        userId: "user_456",
        sessionId: "conv_789",
        agentId: "support-bot",
      },
    });

    expect(cfg.isEnabled).toBe(true);
    expect(cfg.functionId).toBe("agent.support-bot");
    expect(cfg.metadata?.tenantId).toBe("org_123");
    expect(cfg.metadata?.langfuseUserId).toBe("org_123");
    expect(cfg.metadata?.langfuseSessionId).toBe("conv_789");
  });
});

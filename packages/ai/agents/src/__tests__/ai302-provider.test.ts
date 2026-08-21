/**
 * 302.AI provider wiring.
 *
 * Two things can silently go wrong with an OpenAI-compatible aggregator and
 * neither shows up in a typecheck: the request goes to api.openai.com because
 * nobody set `baseURL`, and the model id keeps the OpenRouter routing prefix
 * that 302 does not use. Both are pinned here.
 *
 * The base URL was confirmed against the live service — an unauthenticated
 * POST to https://api.302.ai/v1/chat/completions answers `Missing 302 Apikey`,
 * so the path exists and auth is Bearer. No key is needed to run these tests.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetAgentsEnvCache } from "../env";
import { filterAvailableProviders } from "../fallback";
import { NebutraAIConfigSchema, resolveApiKey } from "../sdk/config";
import {
  AI302_ALIASES,
  AI302_OPEN_MODELS,
  FRONTIER_FALLBACK,
} from "../sdk/frontier-fallback.generated";
import { models } from "../sdk/models";
import { createModel } from "../sdk/provider";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    Object.assign((id: string) => ({ __provider: "openai-compatible", __id: id }), {
      textEmbeddingModel: vi.fn((id: string) => ({ __id: id, __kind: "embedding" })),
    }),
  ),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => ({ chat: vi.fn((id: string) => ({ __id: id })) })),
}));

const mockedCreateOpenAI = vi.mocked(createOpenAI);

function config(overrides: Record<string, unknown> = {}) {
  return NebutraAIConfigSchema.parse({ provider: "ai302", apiKey: "test-key", ...overrides });
}

/** Options the SDK factory was constructed with on the most recent call. */
function lastFactoryOptions() {
  return mockedCreateOpenAI.mock.calls.at(-1)?.[0] as { baseURL?: string } | undefined;
}

describe("302.AI provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAgentsEnvCache();
  });

  it("points at api.302.ai rather than the default OpenAI host", () => {
    createModel("gpt-4o", config());
    expect(lastFactoryOptions()?.baseURL).toBe("https://api.302.ai/v1");
  });

  it("honours AI302_BASE_URL for a self-hosted or regional relay", () => {
    vi.stubEnv("AI302_BASE_URL", "https://relay.internal/v1");
    createModel("gpt-4o", config());
    expect(lastFactoryOptions()?.baseURL).toBe("https://relay.internal/v1");
  });

  it("strips the OpenRouter routing prefix, which 302 does not use", () => {
    const model = createModel("anthropic/claude-sonnet-4.6", config()) as unknown as {
      __id: string;
    };
    expect(model.__id).toBe("claude-sonnet-4.6");
  });

  it("leaves a bare vendor-native id alone", () => {
    const model = createModel("MiniMax-M2.1", config()) as unknown as { __id: string };
    expect(model.__id).toBe("MiniMax-M2.1");
  });

  it("applies the generated alias where 302 spells the id differently", () => {
    // The gateway writes `anthropic/claude-haiku-4.5`; 302 lists
    // `claude-haiku-4-5-20251001`. Asking for the merely-stripped form gets a
    // 503 "No available models currently", which reads like an outage rather
    // than a wrong id — verified against the live service on 2026-08-21.
    // Asserted through AI302_ALIASES rather than the literal so a regenerated
    // catalogue moves the expectation with the code.
    const aliased = AI302_ALIASES.fast;
    expect(aliased, "the fast tier alias is what this test exists to cover").toBeTruthy();

    const model = createModel("fast", config()) as unknown as { __id: string };
    expect(model.__id).toBe(aliased);
    expect(model.__id).not.toBe("claude-haiku-4.5");
  });

  it("passes through tiers 302 serves under the bare id", () => {
    for (const tier of ["reasoning", "flagship", "openai-flagship"] as const) {
      if (AI302_ALIASES[tier]) continue; // aliased tiers are covered above
      const gatewayId = FRONTIER_FALLBACK[tier];
      const model = createModel(tier, config()) as unknown as { __id: string };
      expect(model.__id).toBe(gatewayId.slice(gatewayId.indexOf("/") + 1));
    }
  });

  it("names AI302_API_KEY when no credential is configured", () => {
    expect(() => resolveApiKey(NebutraAIConfigSchema.parse({ provider: "ai302" }))).toThrow(
      /AI302_API_KEY/,
    );
  });

  it("drops out of the fallback chain when its key is absent", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("AI302_API_KEY", "");
    expect(filterAvailableProviders(["openrouter", "ai302"])).toEqual(["openrouter"]);
  });

  it("stays in the fallback chain when its key is present", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI302_API_KEY", "302-key");
    expect(filterAvailableProviders(["openrouter", "anthropic", "ai302"])).toEqual(["ai302"]);
  });
});

describe("302.AI open-weight presets", () => {
  // Every id here was answered 200 by the live service on 2026-08-21. The test
  // is offline: it asserts the presets resolve and are shaped like 302 ids, so
  // a bad regenerate is caught without a key or a network call.
  it("exposes each generated family as a preset", () => {
    for (const [preset, id] of Object.entries(AI302_OPEN_MODELS)) {
      expect(models[preset as keyof typeof models], `${preset} missing from models`).toBe(id);
    }
  });

  it("keeps them bare, since 302 does not namespace by vendor", () => {
    for (const id of Object.values(AI302_OPEN_MODELS)) {
      expect(id, `${id} carries a gateway prefix 302 will not accept`).not.toContain("/");
    }
  });

  it("has retired the unverifiable SiliconFlow presets", () => {
    // They named Qwen2.5-72B / DeepSeek-R1 / DeepSeek-V3 with no caller and no
    // way to check them, which is exactly the shape of a hallucinated id.
    for (const gone of ["sf-qwen", "sf-deepseek-r1", "sf-deepseek-v3"]) {
      expect(models).not.toHaveProperty(gone);
    }
  });
});

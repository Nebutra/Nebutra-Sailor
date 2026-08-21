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

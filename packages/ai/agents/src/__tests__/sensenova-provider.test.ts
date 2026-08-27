/**
 * SenseNova runtime wiring — OpenAI-compatible provider path + env key.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ResolvedNebutraAIConfig, resolveApiKey } from "../sdk/config";
import { resolveModel } from "../sdk/models";

describe("SenseNova provider wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves SENSENOVA_API_KEY for provider=sensenova", () => {
    vi.stubEnv("SENSENOVA_API_KEY", "sk-test-sense");
    const key = resolveApiKey({
      provider: "sensenova",
      defaultModel: "SenseChat-5",
      temperature: 0.7,
    } as ResolvedNebutraAIConfig);
    expect(key).toBe("sk-test-sense");
  });

  it("throws a clear error when SENSENOVA_API_KEY is missing", () => {
    vi.stubEnv("SENSENOVA_API_KEY", "");
    expect(() =>
      resolveApiKey({
        provider: "sensenova",
        defaultModel: "SenseChat-5",
        temperature: 0.7,
      } as ResolvedNebutraAIConfig),
    ).toThrow(/SENSENOVA_API_KEY/);
  });

  it("maps SenseNova Token Plan small-model presets", () => {
    expect(resolveModel("sn-flash-lite")).toBe("sensenova-6.7-flash-lite");
    expect(resolveModel("sn-deepseek-flash")).toBe("deepseek-v4-flash");
    expect(resolveModel("sn-translate")).toBe("sensenova-6.7-flash-lite");
    expect(resolveModel("sensenova-6.7-flash-lite")).toBe("sensenova-6.7-flash-lite");
  });
});

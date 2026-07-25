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

  it("maps SenseNova model presets", () => {
    expect(resolveModel("sn-sensechat-5")).toBe("SenseChat-5");
    expect(resolveModel("sn-sensechat-turbo")).toBe("SenseChat-Turbo");
    expect(resolveModel("sn-v6-5")).toBe("SenseNova-V6-5");
    expect(resolveModel("SenseChat-5")).toBe("SenseChat-5");
  });
});

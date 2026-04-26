import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}));

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({
    get: mocks.redisGet,
    set: mocks.redisSet,
  }),
}));

import { getFeatureVariant, isFeatureEnabled, useDbProvider } from "../index";

const ambientFeatureFlagEnvKeys = [
  "KILL_SWITCH_AI_STREAMING",
  "KILL_SWITCH_CHECKOUT_COPY_VARIANT",
  "FEATURE_FLAG_AI_STREAMING",
  "FEATURE_FLAG_BETA_DASHBOARD",
  "FEATURE_FLAG_CHECKOUT_COPY_VARIANT",
] as const;

const originalEnv = Object.fromEntries(
  ambientFeatureFlagEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof ambientFeatureFlagEnvKeys)[number], string | undefined>;

function clearAmbientFeatureFlagEnv() {
  for (const key of ambientFeatureFlagEnvKeys) {
    delete process.env[key];
  }
}

function restoreAmbientFeatureFlagEnv() {
  for (const key of ambientFeatureFlagEnvKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("cached feature flags with env fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAmbientFeatureFlagEnv();
    useDbProvider();
    mocks.redisGet.mockResolvedValue(null);
  });

  afterEach(() => {
    restoreAmbientFeatureFlagEnv();
  });

  it("falls back to env flags on cache misses", async () => {
    process.env.FEATURE_FLAG_AI_STREAMING = "true";

    await expect(isFeatureEnabled("ai-streaming")).resolves.toBe(true);

    expect(mocks.redisSet).toHaveBeenCalledWith("sailor:ff:ai-streaming", true, { ex: 10 });
  });

  it("uses cached boolean values before env fallback", async () => {
    process.env.FEATURE_FLAG_BETA_DASHBOARD = "true";
    mocks.redisGet.mockResolvedValue(false);

    await expect(isFeatureEnabled("beta-dashboard")).resolves.toBe(false);

    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("resolves variants from env fallback on cache misses", async () => {
    process.env.FEATURE_FLAG_CHECKOUT_COPY_VARIANT = "treatment";

    await expect(getFeatureVariant("checkout-copy", "control")).resolves.toBe("treatment");

    expect(mocks.redisSet).toHaveBeenCalledWith("sailor:ff:checkout-copy:variant", "treatment", {
      ex: 10,
    });
  });
});

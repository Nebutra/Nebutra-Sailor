import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({ get: vi.fn(), set: vi.fn() }),
}));

import {
  clearMemoryFlags,
  createFeatureFlagProviderAdapter,
  createMemoryProvider,
  getFeatureVariant,
  isEnabledForPercentage,
  isFeatureEnabled,
  setFeatureFlagProvider,
  useMemoryProvider,
} from "../index";

describe("gradual rollout determinism", () => {
  it("clamps percentage inputs and stays deterministic for a flag/context key", async () => {
    await expect(isEnabledForPercentage("new-dashboard", "user_1", -5)).resolves.toBe(false);
    await expect(isEnabledForPercentage("new-dashboard", "user_1", 0)).resolves.toBe(false);
    await expect(isEnabledForPercentage("new-dashboard", "user_1", 100)).resolves.toBe(true);
    await expect(isEnabledForPercentage("new-dashboard", "user_1", 150)).resolves.toBe(true);

    const first = await isEnabledForPercentage("new-dashboard", "tenant_a:user_1", 37);
    const second = await isEnabledForPercentage("new-dashboard", "tenant_a:user_1", 37);
    expect(second).toBe(first);
  });
});

describe("provider adapter contract", () => {
  afterEach(() => {
    useMemoryProvider();
    clearMemoryFlags();
  });

  it("normalizes custom provider adapters and forwards context", async () => {
    const calls: unknown[] = [];
    const provider = createFeatureFlagProviderAdapter({
      isEnabled: async (flag, context) => {
        calls.push({ flag, context });
        return context?.plan === "enterprise";
      },
    });

    setFeatureFlagProvider(provider);

    await expect(
      isFeatureEnabled("priority-support", { tenantId: "tenant_1", plan: "enterprise" }),
    ).resolves.toBe(true);
    await expect(getFeatureVariant("priority-support", "control")).resolves.toBe("control");
    expect(calls).toEqual([
      {
        flag: "priority-support",
        context: { tenantId: "tenant_1", plan: "enterprise" },
      },
    ]);
  });
});

describe("memory provider rollout rules", () => {
  beforeEach(() => {
    clearMemoryFlags();
  });

  afterEach(() => {
    useMemoryProvider();
    clearMemoryFlags();
  });

  it("evaluates deterministic percentage rollout from user or tenant context", async () => {
    const provider = createMemoryProvider({
      "rollout-flag": {
        enabled: true,
        rolloutPercentage: 25,
      },
    });
    setFeatureFlagProvider(provider);

    const userResult = await isFeatureEnabled("rollout-flag", {
      tenantId: "tenant_a",
      userId: "user_42",
    });
    await expect(
      isFeatureEnabled("rollout-flag", { tenantId: "tenant_a", userId: "user_42" }),
    ).resolves.toBe(userResult);

    const tenantResult = await isFeatureEnabled("rollout-flag", { tenantId: "tenant_only" });
    await expect(isFeatureEnabled("rollout-flag", { tenantId: "tenant_only" })).resolves.toBe(
      tenantResult,
    );
  });
});

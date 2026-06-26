import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({ get: vi.fn(), set: vi.fn() }),
}));

import {
  createMemoryProvider,
  resolveFeatureFlagRuntimeStatus,
  setFeatureFlagProvider,
  useDbProvider,
  useEnvProvider,
  useMemoryProvider,
} from "../index";

describe("feature flag runtime status", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    useDbProvider();
  });

  it("reports the cached provider as production-capable", () => {
    useDbProvider();

    expect(resolveFeatureFlagRuntimeStatus()).toMatchObject({
      provider: "cache",
      mode: "self_hosted",
      canEvaluate: true,
      productionSafe: true,
      missing: [],
    });
  });

  it("reports env provider as production-capable but operator-managed", () => {
    useEnvProvider();

    expect(resolveFeatureFlagRuntimeStatus()).toMatchObject({
      provider: "env",
      mode: "operator_managed",
      canEvaluate: true,
      productionSafe: true,
    });
  });

  it("fails closed when memory provider is selected in production without an escape hatch", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MEMORY_FEATURE_FLAGS_IN_PRODUCTION", "");

    expect(() => useMemoryProvider()).toThrow(/Refusing to use in-memory feature flags/i);
  });

  it("fails closed when an explicit memory provider is injected in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MEMORY_FEATURE_FLAGS_IN_PRODUCTION", "");

    expect(() => setFeatureFlagProvider(createMemoryProvider({ preview: true }))).toThrow(
      /Refusing to use in-memory feature flags/i,
    );
  });
});

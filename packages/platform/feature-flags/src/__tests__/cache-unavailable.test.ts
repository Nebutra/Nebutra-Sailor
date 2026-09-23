import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The web standalone server can be missing `@nebutra/cache` (it is
 * externalized and pnpm does not hoist workspace packages), which made the
 * cache import throw inside the flag provider's try block *before* the env
 * check — so every flag resolved to false and no env flag could be enabled.
 * The cache must be optional: flags still resolve from env when it is absent.
 */
vi.mock("@nebutra/cache", () => {
  throw new Error("Cannot find package '@nebutra/cache'");
});

import { getFeatureVariant, isFeatureEnabled, useDbProvider } from "../index";

const KEYS = [
  "FEATURE_FLAG_CACHE_LESS_DEMO",
  "FEATURE_FLAG_CACHE_LESS_DEMO_VARIANT",
  "KILL_SWITCH_CACHE_LESS_DEMO",
] as const;

describe("feature flags when @nebutra/cache cannot be imported", () => {
  afterEach(() => {
    for (const key of KEYS) delete process.env[key];
  });

  it("resolves an env-enabled flag instead of falling back to false", async () => {
    useDbProvider();
    process.env.FEATURE_FLAG_CACHE_LESS_DEMO = "true";

    await expect(isFeatureEnabled("cache-less-demo")).resolves.toBe(true);
  });

  it("still honours the kill switch", async () => {
    useDbProvider();
    process.env.FEATURE_FLAG_CACHE_LESS_DEMO = "true";
    process.env.KILL_SWITCH_CACHE_LESS_DEMO = "false";

    await expect(isFeatureEnabled("cache-less-demo")).resolves.toBe(false);
  });

  it("resolves variants from env", async () => {
    useDbProvider();
    process.env.FEATURE_FLAG_CACHE_LESS_DEMO_VARIANT = "treatment";

    await expect(getFeatureVariant("cache-less-demo", "control")).resolves.toBe("treatment");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({ get: vi.fn(), set: vi.fn() }),
}));

import {
  clearMemoryFlags,
  FLAGS,
  getFeatureVariant,
  isEnabledForPercentage,
  isFeatureEnabled,
  setMemoryFlag,
  setMemoryVariant,
  useMemoryProvider,
} from "../index";

describe("memory provider", () => {
  beforeEach(() => {
    clearMemoryFlags();
    useMemoryProvider();
  });

  afterEach(() => {
    clearMemoryFlags();
  });

  it("returns false for unset flags", async () => {
    expect(await isFeatureEnabled("nonexistent")).toBe(false);
  });

  it("returns true for enabled flags", async () => {
    setMemoryFlag("test-flag", true);
    expect(await isFeatureEnabled("test-flag")).toBe(true);
  });

  it("returns false for explicitly disabled flags", async () => {
    setMemoryFlag("test-flag", false);
    expect(await isFeatureEnabled("test-flag")).toBe(false);
  });

  it("supports toggling flags", async () => {
    setMemoryFlag("toggle-flag", true);
    expect(await isFeatureEnabled("toggle-flag")).toBe(true);
    setMemoryFlag("toggle-flag", false);
    expect(await isFeatureEnabled("toggle-flag")).toBe(false);
  });

  it("returns default variant for unset flags", async () => {
    expect(await getFeatureVariant("unset", "control")).toBe("control");
  });

  it("returns stored variant value", async () => {
    setMemoryVariant("checkout-copy", "treatment-b");
    expect(await getFeatureVariant("checkout-copy", "control")).toBe("treatment-b");
  });

  it("clears all flags", async () => {
    setMemoryFlag("a", true);
    setMemoryFlag("b", true);
    setMemoryVariant("c", "variant");
    clearMemoryFlags();
    expect(await isFeatureEnabled("a")).toBe(false);
    expect(await isFeatureEnabled("b")).toBe(false);
    expect(await getFeatureVariant("c", "default")).toBe("default");
  });
});

describe("FLAGS constants", () => {
  it("defines AI feature flags", () => {
    expect(FLAGS.AI_STREAMING).toBe("ai-streaming");
    expect(FLAGS.AI_VISION).toBe("ai-vision");
    expect(FLAGS.AI_CODE_INTERPRETER).toBe("ai-code-interpreter");
  });

  it("defines platform feature flags", () => {
    expect(FLAGS.MULTI_TENANT).toBe("multi-tenant");
    expect(FLAGS.TEAM_COLLABORATION).toBe("team-collaboration");
    expect(FLAGS.API_V2).toBe("api-v2");
  });

  it("has unique values for all flags", () => {
    const values = Object.values(FLAGS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("isEnabledForPercentage", () => {
  it("returns true for 100% rollout", async () => {
    expect(await isEnabledForPercentage("flag", "user_1", 100)).toBe(true);
  });

  it("returns false for 0% rollout", async () => {
    expect(await isEnabledForPercentage("flag", "user_1", 0)).toBe(false);
  });

  it("is deterministic for same user+flag", async () => {
    const r1 = await isEnabledForPercentage("flag", "user_1", 50);
    const r2 = await isEnabledForPercentage("flag", "user_1", 50);
    expect(r1).toBe(r2);
  });

  it("distributes users across buckets", async () => {
    let enabled = 0;
    const total = 100;
    for (let i = 0; i < total; i++) {
      if (await isEnabledForPercentage("test-flag", `user_${i}`, 50)) {
        enabled++;
      }
    }
    // With 100 users at 50%, expect roughly 30-70 (generous tolerance for hash distribution)
    expect(enabled).toBeGreaterThan(20);
    expect(enabled).toBeLessThan(80);
  });

  it("different flags produce different bucketing for same user", async () => {
    // At 50%, different flags should sometimes give different results for the same user
    let differences = 0;
    for (let i = 0; i < 50; i++) {
      const a = await isEnabledForPercentage("flag-a", `user_${i}`, 50);
      const b = await isEnabledForPercentage("flag-b", `user_${i}`, 50);
      if (a !== b) differences++;
    }
    expect(differences).toBeGreaterThan(0);
  });
});

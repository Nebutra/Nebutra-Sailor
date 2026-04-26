import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({
    get: mocks.redisGet,
    set: mocks.redisSet,
  }),
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    featureFlag: {
      findUnique: mocks.findUnique,
    },
  }),
}));

import { getFeatureVariant, isFeatureEnabled, useDbProvider } from "../index";

const ambientKillSwitchKeys = [
  "KILL_SWITCH_AI_STREAMING",
  "KILL_SWITCH_CHECKOUT_COPY_VARIANT",
] as const;

const originalEnv = Object.fromEntries(
  ambientKillSwitchKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof ambientKillSwitchKeys)[number], string | undefined>;

function clearAmbientKillSwitches() {
  for (const key of ambientKillSwitchKeys) {
    delete process.env[key];
  }
}

function restoreAmbientKillSwitches() {
  for (const key of ambientKillSwitchKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("db-backed feature flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAmbientKillSwitches();
    useDbProvider();
    mocks.redisGet.mockResolvedValue(null);
  });

  afterEach(() => {
    restoreAmbientKillSwitches();
  });

  it("looks up flags by key and reads the current isEnabled field", async () => {
    mocks.findUnique.mockResolvedValue({
      isEnabled: true,
      value: null,
    });

    await expect(isFeatureEnabled("ai-streaming")).resolves.toBe(true);

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { key: "ai-streaming" },
    });
    expect(mocks.redisSet).toHaveBeenCalledWith("sailor:ff:ai-streaming", true, { ex: 10 });
  });

  it("uses cached boolean values before hitting the database", async () => {
    mocks.redisGet.mockResolvedValue(false);

    await expect(isFeatureEnabled("beta-dashboard")).resolves.toBe(false);

    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("resolves variants from the current value column", async () => {
    mocks.findUnique.mockResolvedValue({
      isEnabled: true,
      value: { variant: "treatment" },
    });

    await expect(getFeatureVariant("checkout-copy", "control")).resolves.toBe("treatment");

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { key: "checkout-copy" },
    });
    expect(mocks.redisSet).toHaveBeenCalledWith("sailor:ff:checkout-copy:variant", "treatment", {
      ex: 10,
    });
  });
});

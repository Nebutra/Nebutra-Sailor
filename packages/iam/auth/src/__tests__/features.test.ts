import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthFeature } from "../features";

/**
 * Tests for the dual-source auth feature-flag layer.
 *
 * Resolution order under test:
 *   1. NEXT_PUBLIC_AUTH_<NAME> env var  → authoritative when "0"/"1"/"true"/"false"
 *   2. @nebutra/feature-flags evaluator → consulted when env is unset
 *   3. safe default false               → on any error / missing package
 */

const ENV_KEYS = {
  passkeys: "NEXT_PUBLIC_AUTH_PASSKEYS",
  organizations: "NEXT_PUBLIC_AUTH_ORGANIZATIONS",
  twoFactor: "NEXT_PUBLIC_AUTH_TWO_FACTOR",
  magicLink: "NEXT_PUBLIC_AUTH_MAGIC_LINK",
  impersonation: "NEXT_PUBLIC_AUTH_IMPERSONATION",
} as const;

type AuthEnvKey = (typeof ENV_KEYS)[AuthFeature];

function clearAllAuthEnv(): void {
  for (const key of Object.values(ENV_KEYS)) {
    delete process.env[key];
  }
}

async function loadFresh() {
  vi.resetModules();
  return await import("../features");
}

describe("features — env-only sync path", () => {
  beforeEach(() => {
    clearAllAuthEnv();
  });
  afterEach(() => {
    clearAllAuthEnv();
    vi.doUnmock("@nebutra/feature-flags");
    vi.resetModules();
  });

  it("returns true when env=1", async () => {
    process.env.NEXT_PUBLIC_AUTH_PASSKEYS = "1";
    const { isAuthFeatureEnabledSync } = await loadFresh();
    expect(isAuthFeatureEnabledSync("passkeys")).toBe(true);
  });

  it("returns true when env=true", async () => {
    process.env.NEXT_PUBLIC_AUTH_PASSKEYS = "true";
    const { isAuthFeatureEnabledSync } = await loadFresh();
    expect(isAuthFeatureEnabledSync("passkeys")).toBe(true);
  });

  it("returns false when env is unset (never touches feature-flags)", async () => {
    // We don't mock @nebutra/feature-flags; sync must never import it. If it
    // did, this test would still pass because we return false on missing env,
    // but the assertion documents intent.
    const { isAuthFeatureEnabledSync } = await loadFresh();
    expect(isAuthFeatureEnabledSync("passkeys")).toBe(false);
  });

  it("returns false when env=0", async () => {
    process.env.NEXT_PUBLIC_AUTH_PASSKEYS = "0";
    const { isAuthFeatureEnabledSync } = await loadFresh();
    expect(isAuthFeatureEnabledSync("passkeys")).toBe(false);
  });
});

describe("features — env wins on async path", () => {
  beforeEach(() => {
    clearAllAuthEnv();
  });
  afterEach(() => {
    clearAllAuthEnv();
    vi.doUnmock("@nebutra/feature-flags");
    vi.resetModules();
  });

  it("env=1 → true even if feature-flags would say false", async () => {
    process.env.NEXT_PUBLIC_AUTH_PASSKEYS = "1";
    vi.doMock("@nebutra/feature-flags", () => ({
      isFeatureEnabled: vi.fn(async () => false),
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("passkeys")).resolves.toBe(true);
  });

  it("env=0 → false even if feature-flags would say true (env is authoritative)", async () => {
    process.env.NEXT_PUBLIC_AUTH_PASSKEYS = "0";
    const evaluate = vi.fn(async () => true);
    vi.doMock("@nebutra/feature-flags", () => ({
      isFeatureEnabled: evaluate,
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("passkeys")).resolves.toBe(false);
    expect(evaluate).not.toHaveBeenCalled();
  });
});

describe("features — defers to @nebutra/feature-flags when env unset", () => {
  beforeEach(() => {
    clearAllAuthEnv();
  });
  afterEach(() => {
    clearAllAuthEnv();
    vi.doUnmock("@nebutra/feature-flags");
    vi.resetModules();
  });

  it("feature-flags returns true → returns true", async () => {
    vi.doMock("@nebutra/feature-flags", () => ({
      isFeatureEnabled: vi.fn(async () => true),
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("organizations")).resolves.toBe(true);
  });

  it("feature-flags returns false → returns false", async () => {
    vi.doMock("@nebutra/feature-flags", () => ({
      isFeatureEnabled: vi.fn(async () => false),
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("organizations")).resolves.toBe(false);
  });

  it("calls feature-flags with namespaced flag name 'auth.<feature>'", async () => {
    const spy = vi.fn(async () => true);
    vi.doMock("@nebutra/feature-flags", () => ({
      isFeatureEnabled: spy,
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await isAuthFeatureEnabled("twoFactor", { userId: "u_1", organizationId: "o_1" });
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0];
    expect(call).toBeDefined();
    const [flagName, ctx] = call as unknown as [string, unknown];
    expect(flagName).toBe("auth.twoFactor");
    // Context translated to feature-flags shape (tenantId, not organizationId)
    expect(ctx).toMatchObject({ userId: "u_1", tenantId: "o_1" });
  });

  it("feature-flags throws → returns false (safe default, no rethrow)", async () => {
    vi.doMock("@nebutra/feature-flags", () => ({
      isFeatureEnabled: vi.fn(async () => {
        throw new Error("ff backend down");
      }),
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("magicLink")).resolves.toBe(false);
  });

  it("feature-flags package missing → returns false (safe default)", async () => {
    vi.doMock("@nebutra/feature-flags", () => {
      throw new Error("Cannot find module '@nebutra/feature-flags'");
    });
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("impersonation")).resolves.toBe(false);
  });

  it("feature-flags exports no usable function → returns false", async () => {
    vi.doMock("@nebutra/feature-flags", () => ({
      // No isFeatureEnabled, no evaluate
      someUnrelated: () => true,
    }));
    const { isAuthFeatureEnabled } = await loadFresh();
    await expect(isAuthFeatureEnabled("passkeys")).resolves.toBe(false);
  });
});

describe("features — ENV_KEY mapping covers all AuthFeature names", () => {
  beforeEach(() => {
    clearAllAuthEnv();
  });
  afterEach(() => {
    clearAllAuthEnv();
    vi.resetModules();
  });

  it.each([
    ["passkeys", "NEXT_PUBLIC_AUTH_PASSKEYS"],
    ["organizations", "NEXT_PUBLIC_AUTH_ORGANIZATIONS"],
    ["twoFactor", "NEXT_PUBLIC_AUTH_TWO_FACTOR"],
    ["magicLink", "NEXT_PUBLIC_AUTH_MAGIC_LINK"],
    ["impersonation", "NEXT_PUBLIC_AUTH_IMPERSONATION"],
  ] as const)("%s → reads %s", async (feature: AuthFeature, envKey: AuthEnvKey) => {
    process.env[envKey] = "1";
    const { isAuthFeatureEnabledSync } = await loadFresh();
    expect(isAuthFeatureEnabledSync(feature)).toBe(true);
  });
});

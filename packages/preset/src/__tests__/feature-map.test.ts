import { describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../config";
import { getActiveApps, getActivePackages, getFeatureEnvVars } from "../feature-map";

const mockConfig: ResolvedConfig = {
  preset: "ai-saas",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: false,
    blog: false,
    admin: true,
    storybook: false,
    "sailor-docs": false,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    growth: true,
    search: false,
    sso: false,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: true,
    upload: true,
  },
  theme: "neon",
  locales: ["en"],
  defaultLocale: "en",
  apiProtocols: ["rest"],
  authProvider: "clerk",
};

describe("getFeatureEnvVars", () => {
  it("generates FEATURE_FLAG_ env vars for all features", () => {
    const vars = getFeatureEnvVars(mockConfig);
    expect(vars.FEATURE_FLAG_BILLING).toBe("true");
    expect(vars.FEATURE_FLAG_AI).toBe("true");
    expect(vars.FEATURE_FLAG_ECOMMERCE).toBe("false");
    expect(vars.FEATURE_FLAG_WEB3).toBe("false");
    expect(vars.FEATURE_FLAG_GROWTH).toBe("true");
  });

  it("includes theme and locale vars", () => {
    const vars = getFeatureEnvVars(mockConfig);
    expect(vars.NEBUTRA_THEME).toBe("neon");
    expect(vars.NEBUTRA_LOCALES).toBe("en");
    expect(vars.NEBUTRA_DEFAULT_LOCALE).toBe("en");
  });
});

describe("getActiveApps", () => {
  it("returns only enabled app IDs", () => {
    const apps = getActiveApps(mockConfig);
    expect(apps).toEqual(["web", "landing-page", "api-gateway", "admin"]);
  });
});

describe("getActivePackages", () => {
  it("maps app IDs to package names", () => {
    const packages = getActivePackages(mockConfig);
    expect(packages).toContain("@nebutra/web");
    expect(packages).toContain("@nebutra/landing-page");
    expect(packages).toContain("@nebutra/api-gateway");
    expect(packages).toContain("@nebutra/admin");
    expect(packages).not.toContain("@nebutra/blog");
  });
});

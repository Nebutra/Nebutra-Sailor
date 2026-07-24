import { describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../config";
import { getActiveApps, getActivePackages, getFeatureEnvVars } from "../feature-map";

const mockConfig: ResolvedConfig = {
  apps: {
    web: true,
    landing: true,
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
  theme: "factory",
  locales: ["en"],
  defaultLocale: "en",
  apiProtocols: ["rest"],
  authProvider: "clerk",
  deployTargets: {
    web: "vercel",
    landing: "vercel",
    "design-docs": "vercel",
    "sailor-docs": "vercel",
    gateway: "cloudflare-workers",
    "python-ai": "ecs-docker",
  },
  brandConfigPath: "brand.config.ts",
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
    expect(vars.NEBUTRA_THEME).toBe("factory");
    expect(vars.NEBUTRA_LOCALES).toBe("en");
    expect(vars.NEBUTRA_DEFAULT_LOCALE).toBe("en");
  });

  it("includes deployment target vars for provider-switchable DX", () => {
    const vars = getFeatureEnvVars(mockConfig);
    expect(vars.DEPLOY_TARGET_WEB).toBe("vercel");
    expect(vars.DEPLOY_TARGET_LANDING).toBe("vercel");
    expect(vars.DEPLOY_TARGET_GATEWAY).toBe("cloudflare-workers");
    expect(vars.DEPLOY_TARGET_PYTHON_AI).toBe("ecs-docker");
  });

  it("emits NEBUTRA_BRAND_CONFIG from brandConfigPath", () => {
    const vars = getFeatureEnvVars(mockConfig);
    expect(vars.NEBUTRA_BRAND_CONFIG).toBe("brand.config.ts");
  });

  it("emits NEBUTRA_BRAND_CONFIG with a custom path when overridden", () => {
    const customConfig: ResolvedConfig = {
      ...mockConfig,
      brandConfigPath: "config/brand.config.ts",
    };
    const vars = getFeatureEnvVars(customConfig);
    expect(vars.NEBUTRA_BRAND_CONFIG).toBe("config/brand.config.ts");
  });
});

describe("getActiveApps", () => {
  it("returns only enabled app IDs", () => {
    const apps = getActiveApps(mockConfig);
    expect(apps).toEqual(["web", "landing", "api-gateway", "admin"]);
  });
});

describe("getActivePackages", () => {
  it("maps app IDs to package names", () => {
    const packages = getActivePackages(mockConfig);
    expect(packages).toContain("@nebutra/web");
    expect(packages).toContain("@nebutra/landing");
    expect(packages).toContain("@nebutra/gateway");
    expect(packages).toContain("@nebutra/admin");
    expect(packages).not.toContain("@nebutra/blog");
  });
});

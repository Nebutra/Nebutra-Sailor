import { describe, expect, it } from "vitest";
import {
  AppId,
  BUILT_IN_THEME_IDS,
  defineConfig,
  FeatureId,
  NebutraConfigSchema,
  ThemeId,
} from "../config";

describe("NebutraConfigSchema", () => {
  it("parses minimal config with defaults", () => {
    const result = NebutraConfigSchema.parse({});
    expect(result.theme).toBe("factory");
    expect(result.locales).toEqual(["en"]);
    expect(result.defaultLocale).toBe("en");
    expect(result.deployTargets.web).toBe("vercel");
    expect(result.deployTargets.gateway).toBe("cloudflare-workers");
    expect(result.deployTargets["python-ai"]).toBe("ecs-docker");
    // defaults = everything enabled
    expect(Object.values(result.apps).every(Boolean)).toBe(true);
    expect(Object.values(result.features).every(Boolean)).toBe(true);
  });

  it("parses full config", () => {
    const result = NebutraConfigSchema.parse({
      apps: { web: true, blog: false },
      features: { billing: true, web3: false },
      deployTargets: { gateway: "k8s", "python-ai": "aws" },
      theme: "vanta",
      locales: ["en", "zh"],
      defaultLocale: "zh",
    });
    expect(result.theme).toBe("vanta");
    expect(result.locales).toEqual(["en", "zh"]);
    expect(result.defaultLocale).toBe("zh");
    expect(result.apps).toEqual({ web: true, blog: false });
    expect(result.features).toEqual({ billing: true, web3: false });
    expect(result.deployTargets).toMatchObject({ gateway: "k8s", "python-ai": "aws" });
    expect(result.deployTargets.web).toBe("vercel");
  });

  it("rejects invalid theme", () => {
    expect(() => NebutraConfigSchema.parse({ theme: "nope" })).toThrow();
  });

  it("rejects deploy targets that are not allowed for a service surface", () => {
    expect(() =>
      NebutraConfigSchema.parse({
        deployTargets: { web: "k8s" },
      }),
    ).toThrow(/not allowed/);
  });
});

describe("AppId", () => {
  it("accepts all 8 app IDs", () => {
    const ids = [
      "web",
      "landing-page",
      "blog",
      "admin",
      "api-gateway",
      "studio",
      "storybook",
      "sailor-docs",
    ];
    for (const id of ids) {
      expect(AppId.parse(id)).toBe(id);
    }
  });
});

describe("FeatureId", () => {
  it("accepts all 14 feature IDs", () => {
    const ids = [
      "billing",
      "ai",
      "ecommerce",
      "web3",
      "community",
      "blog",
      "growth",
      "search",
      "sso",
      "admin",
      "analytics",
      "newsletter",
      "realtime",
      "upload",
    ];
    for (const id of ids) {
      expect(FeatureId.parse(id)).toBe(id);
    }
  });
});

describe("ThemeId", () => {
  it("accepts design language IDs and custom", () => {
    expect(BUILT_IN_THEME_IDS.length).toBeGreaterThan(0);
    expect(BUILT_IN_THEME_IDS).toEqual(
      expect.arrayContaining(["factory", "linear", "vanta", "raycast"]),
    );
    expect(BUILT_IN_THEME_IDS).not.toContain("vibrant");
    for (const id of [...BUILT_IN_THEME_IDS, "custom"]) {
      expect(ThemeId.parse(id)).toBe(id);
    }
  });
});

describe("NebutraConfigSchema — brandConfigPath", () => {
  it("defaults brandConfigPath to 'brand.config.ts'", () => {
    const result = NebutraConfigSchema.parse({});
    expect(result.brandConfigPath).toBe("brand.config.ts");
  });

  it("accepts a custom brandConfigPath override", () => {
    const result = NebutraConfigSchema.parse({ brandConfigPath: "custom/brand.config.ts" });
    expect(result.brandConfigPath).toBe("custom/brand.config.ts");
  });
});

describe("defineConfig", () => {
  it("returns parsed config with defaults", () => {
    const config = defineConfig({});
    expect(config.theme).toBe("factory");
    expect(Object.values(config.apps).every(Boolean)).toBe(true);
  });

  it("accepts partial overrides", () => {
    const config = defineConfig({ theme: "linear", deployTargets: { gateway: "aws" } });
    expect(config.theme).toBe("linear");
    expect(config.deployTargets.gateway).toBe("aws");
    expect(config.deployTargets.web).toBe("vercel");
  });

  it("throws on invalid input", () => {
    expect(() => defineConfig({ theme: "bad" as never })).toThrow();
  });
});

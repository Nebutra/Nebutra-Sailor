import { describe, expect, it } from "vitest";
import { AppId, defineConfig, FeatureId, NebutraConfigSchema, PresetId, ThemeId } from "../config";

describe("NebutraConfigSchema", () => {
  it("parses minimal config with defaults", () => {
    const result = NebutraConfigSchema.parse({});
    expect(result.preset).toBe("full");
    expect(result.theme).toBe("neon");
    expect(result.locales).toEqual(["en"]);
    expect(result.defaultLocale).toBe("en");
  });

  it("parses full config", () => {
    const result = NebutraConfigSchema.parse({
      preset: "ai-saas",
      apps: { web: true, blog: false },
      features: { billing: true, web3: false },
      theme: "gradient",
      locales: ["en", "zh"],
      defaultLocale: "zh",
    });
    expect(result.preset).toBe("ai-saas");
    expect(result.theme).toBe("gradient");
    expect(result.locales).toEqual(["en", "zh"]);
    expect(result.defaultLocale).toBe("zh");
    expect(result.apps).toEqual({ web: true, blog: false });
    expect(result.features).toEqual({ billing: true, web3: false });
  });

  it("rejects invalid preset", () => {
    expect(() => NebutraConfigSchema.parse({ preset: "invalid" })).toThrow();
  });

  it("rejects invalid theme", () => {
    expect(() => NebutraConfigSchema.parse({ theme: "nope" })).toThrow();
  });
});

describe("PresetId", () => {
  it("accepts all 10 preset IDs", () => {
    const ids = [
      "ai-saas",
      "marketing",
      "dashboard",
      "overseas",
      "growth",
      "creative",
      "blog-portfolio",
      "community",
      "one-person",
      "full",
    ];
    for (const id of ids) {
      expect(PresetId.parse(id)).toBe(id);
    }
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
  it("accepts all 7 theme IDs", () => {
    const ids = ["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean", "custom"];
    for (const id of ids) {
      expect(ThemeId.parse(id)).toBe(id);
    }
  });
});

describe("defineConfig", () => {
  it("returns parsed config with defaults", () => {
    const config = defineConfig({});
    expect(config.preset).toBe("full");
    expect(config.theme).toBe("neon");
  });

  it("accepts partial overrides", () => {
    const config = defineConfig({ preset: "marketing", theme: "gradient" });
    expect(config.preset).toBe("marketing");
    expect(config.theme).toBe("gradient");
  });

  it("throws on invalid input", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => defineConfig({ preset: "bad" as any })).toThrow();
  });
});

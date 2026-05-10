import { describe, expect, it } from "vitest";
import { defineConfig, type NebutraConfig, NebutraConfigSchema, resolveConfig } from "../config";
import { getActiveApps, getActivePackages, getFeatureEnvVars } from "../feature-map";
import { getPreset, presets } from "../presets";

describe("NebutraConfigSchema", () => {
  it("validates a fully specified config", () => {
    const input = {
      preset: "ai-saas",
      apps: { web: true, blog: false },
      features: { billing: true },
      theme: "neon",
      locales: ["en", "ja"],
      defaultLocale: "en",
    };

    const result = NebutraConfigSchema.parse(input);

    expect(result.preset).toBe("ai-saas");
    expect(result.theme).toBe("neon");
    expect(result.locales).toEqual(["en", "ja"]);
  });

  it("applies defaults for missing optional fields", () => {
    const result = NebutraConfigSchema.parse({});

    expect(result.preset).toBe("full");
    expect(result.theme).toBe("neon");
    expect(result.locales).toEqual(["en"]);
    expect(result.defaultLocale).toBe("en");
  });

  it("rejects an invalid preset id", () => {
    expect(() => NebutraConfigSchema.parse({ preset: "nonexistent" })).toThrow();
  });

  it("rejects an invalid theme id", () => {
    expect(() => NebutraConfigSchema.parse({ theme: "nonexistent" })).toThrow();
  });

  it("accepts all valid preset ids", () => {
    const validPresets = [
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

    for (const preset of validPresets) {
      const result = NebutraConfigSchema.parse({ preset });
      expect(result.preset).toBe(preset);
    }
  });

  it("accepts all valid theme ids", () => {
    const validThemes = ["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean", "custom"];

    for (const theme of validThemes) {
      const result = NebutraConfigSchema.parse({ theme });
      expect(result.theme).toBe(theme);
    }
  });
});

describe("defineConfig", () => {
  it("parses and returns a valid NebutraConfig", () => {
    const config = defineConfig({ preset: "dashboard", theme: "minimal" });

    expect(config.preset).toBe("dashboard");
    expect(config.theme).toBe("minimal");
    expect(config.locales).toEqual(["en"]);
  });

  it("applies defaults for empty input", () => {
    const config = defineConfig({});

    expect(config.preset).toBe("full");
    expect(config.theme).toBe("neon");
  });

  it("throws for invalid input", () => {
    expect(() => defineConfig({ preset: "bad" as never })).toThrow();
  });
});

describe("getPreset", () => {
  it("returns the correct preset for ai-saas", () => {
    const preset = getPreset("ai-saas");

    expect(preset.id).toBe("ai-saas");
    expect(preset.name).toBe("AI SaaS");
    expect(preset.apps.web).toBe(true);
    expect(preset.features.ai).toBe(true);
  });

  it("returns the full preset", () => {
    const preset = getPreset("full");

    expect(preset.id).toBe("full");
    // Full preset has everything enabled
    expect(Object.values(preset.apps).every(Boolean)).toBe(true);
    expect(Object.values(preset.features).every(Boolean)).toBe(true);
  });

  it("throws for an unknown preset id", () => {
    expect(() => getPreset("unknown")).toThrow();
  });

  it("has all expected presets registered", () => {
    const expectedIds = [
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

    for (const id of expectedIds) {
      expect(presets[id]).toBeDefined();
    }
  });
});

describe("resolveConfig", () => {
  it("merges user overrides on top of preset defaults", () => {
    const config: NebutraConfig = defineConfig({
      preset: "ai-saas",
      apps: { blog: true },
      features: { ecommerce: true },
    });

    const resolved = resolveConfig(config);

    // blog is false in ai-saas preset but overridden to true
    expect(resolved.apps.blog).toBe(true);
    // ecommerce is false in ai-saas preset but overridden to true
    expect(resolved.features.ecommerce).toBe(true);
    // web stays true from preset
    expect(resolved.apps.web).toBe(true);
  });

  it("uses the config theme, not the preset theme", () => {
    const config = defineConfig({ preset: "full", theme: "ocean" });
    const resolved = resolveConfig(config);

    expect(resolved.theme).toBe("ocean");
  });

  it("passes through locales and defaultLocale", () => {
    const config = defineConfig({
      locales: ["en", "ja", "zh"],
      defaultLocale: "ja",
    });
    const resolved = resolveConfig(config);

    expect(resolved.locales).toEqual(["en", "ja", "zh"]);
    expect(resolved.defaultLocale).toBe("ja");
  });
});

describe("getActiveApps", () => {
  it("returns only apps that are enabled", () => {
    const config = defineConfig({ preset: "ai-saas" });
    const resolved = resolveConfig(config);
    const active = getActiveApps(resolved);

    expect(active).toContain("web");
    expect(active).toContain("landing-page");
    // blog is disabled in ai-saas
    expect(active).not.toContain("blog");
  });

  it("returns all apps for full preset", () => {
    const config = defineConfig({ preset: "full" });
    const resolved = resolveConfig(config);
    const active = getActiveApps(resolved);

    expect(active).toContain("web");
    expect(active).toContain("blog");
    expect(active).toContain("admin");
    expect(active).toContain("storybook");
  });
});

describe("getActivePackages", () => {
  it("maps active apps to package names", () => {
    const config = defineConfig({ preset: "ai-saas" });
    const resolved = resolveConfig(config);
    const packages = getActivePackages(resolved);

    expect(packages).toContain("@nebutra/web");
    expect(packages).toContain("@nebutra/landing-page");
    expect(packages).not.toContain("@nebutra/blog");
  });
});

describe("getFeatureEnvVars", () => {
  it("generates FEATURE_FLAG_ env vars for each feature", () => {
    const config = defineConfig({ preset: "ai-saas" });
    const resolved = resolveConfig(config);
    const vars = getFeatureEnvVars(resolved);

    expect(vars.FEATURE_FLAG_BILLING).toBe("true");
    expect(vars.FEATURE_FLAG_AI).toBe("true");
    expect(vars.FEATURE_FLAG_ECOMMERCE).toBe("false");
  });

  it("includes theme and locale vars", () => {
    const config = defineConfig({
      theme: "ocean",
      locales: ["en", "ja"],
      defaultLocale: "ja",
    });
    const resolved = resolveConfig(config);
    const vars = getFeatureEnvVars(resolved);

    expect(vars.NEBUTRA_THEME).toBe("ocean");
    expect(vars.NEBUTRA_LOCALES).toBe("en,ja");
    expect(vars.NEBUTRA_DEFAULT_LOCALE).toBe("ja");
  });

  it("uppercases and replaces hyphens in feature keys", () => {
    // web3 feature key should become FEATURE_FLAG_WEB3
    const config = defineConfig({ preset: "full" });
    const resolved = resolveConfig(config);
    const vars = getFeatureEnvVars(resolved);

    expect(vars.FEATURE_FLAG_WEB3).toBe("true");
  });
});

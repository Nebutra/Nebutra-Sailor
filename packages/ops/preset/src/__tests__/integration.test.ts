import { describe, expect, it } from "vitest";
import {
  defineConfig,
  getActiveApps,
  getFeatureEnvVars,
  type NebutraConfig,
  presets,
  resolveConfig,
} from "../index";

describe("preset → theme integration", () => {
  it("each preset resolves to a valid theme", () => {
    const validThemes = ["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean", "custom"];
    for (const [id, _preset] of Object.entries(presets)) {
      const config = defineConfig({ preset: id as NebutraConfig["preset"] });
      const resolved = resolveConfig(config);
      expect(validThemes).toContain(resolved.theme);
    }
  });

  it("full end-to-end: config → resolve → env vars", () => {
    const config = defineConfig({
      preset: "ai-saas",
      theme: "neon",
      locales: ["en", "zh"],
    });
    const resolved = resolveConfig(config);
    const envVars = getFeatureEnvVars(resolved);
    const activeApps = getActiveApps(resolved);

    // Theme
    expect(envVars.NEBUTRA_THEME).toBe("neon");

    // Apps
    expect(activeApps).toContain("web");
    expect(activeApps).toContain("landing-page");
    expect(activeApps).not.toContain("blog");

    // Features
    expect(envVars.FEATURE_FLAG_AI).toBe("true");
    expect(envVars.FEATURE_FLAG_BILLING).toBe("true");
    expect(envVars.FEATURE_FLAG_WEB3).toBe("false");

    // Locales
    expect(envVars.NEBUTRA_LOCALES).toBe("en,zh");
  });

  it("user overrides merge correctly", () => {
    const config = defineConfig({
      preset: "marketing",
      apps: { web: true },
      features: { ai: true },
      theme: "vibrant",
    });
    const resolved = resolveConfig(config);

    // From preset: landing-page=true
    expect(resolved.apps["landing-page"]).toBe(true);
    // Override: web=true (was false in marketing)
    expect(resolved.apps.web).toBe(true);
    // Override: ai=true (was false in marketing)
    expect(resolved.features.ai).toBe(true);
    // Override: theme=vibrant (was gradient in marketing)
    expect(resolved.theme).toBe("vibrant");
  });
});

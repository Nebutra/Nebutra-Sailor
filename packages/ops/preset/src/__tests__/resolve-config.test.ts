import { describe, expect, it } from "vitest";
import { defineConfig, resolveConfig } from "../config";

describe("resolveConfig", () => {
  it("resolves minimal config using full preset defaults", () => {
    const config = defineConfig({});
    const resolved = resolveConfig(config);
    // "full" preset = everything enabled
    expect(resolved.apps.web).toBe(true);
    expect(resolved.apps.blog).toBe(true);
    expect(resolved.features.billing).toBe(true);
    expect(resolved.features.ai).toBe(true);
    expect(resolved.theme).toBe("neon");
  });

  it("resolves ai-saas preset", () => {
    const config = defineConfig({ preset: "ai-saas" });
    const resolved = resolveConfig(config);
    expect(resolved.apps.web).toBe(true);
    expect(resolved.apps.blog).toBe(false);
    expect(resolved.features.ai).toBe(true);
    expect(resolved.features.web3).toBe(false);
  });

  it("applies user overrides on top of preset", () => {
    const config = defineConfig({
      preset: "ai-saas",
      apps: { blog: true },
      features: { web3: true },
    });
    const resolved = resolveConfig(config);
    // From preset: web=true
    expect(resolved.apps.web).toBe(true);
    // Override: blog=true (was false in ai-saas)
    expect(resolved.apps.blog).toBe(true);
    // Override: web3=true (was false in ai-saas)
    expect(resolved.features.web3).toBe(true);
    // From preset: ai=true (unchanged)
    expect(resolved.features.ai).toBe(true);
  });

  it("preserves locales and theme", () => {
    const config = defineConfig({
      preset: "marketing",
      theme: "vibrant",
      locales: ["en", "zh", "ja"],
      defaultLocale: "zh",
    });
    const resolved = resolveConfig(config);
    expect(resolved.theme).toBe("vibrant");
    expect(resolved.locales).toEqual(["en", "zh", "ja"]);
    expect(resolved.defaultLocale).toBe("zh");
  });
});

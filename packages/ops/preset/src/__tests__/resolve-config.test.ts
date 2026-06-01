import { describe, expect, it } from "vitest";
import { defineConfig, resolveConfig } from "../config";

describe("resolveConfig", () => {
  it("resolves minimal config using defaults (everything enabled)", () => {
    const config = defineConfig({});
    const resolved = resolveConfig(config);
    expect(resolved.apps.web).toBe(true);
    expect(resolved.apps.blog).toBe(true);
    expect(resolved.features.billing).toBe(true);
    expect(resolved.features.ai).toBe(true);
    expect(resolved.theme).toBe("nebutra");
  });

  it("applies user overrides on top of defaults", () => {
    const config = defineConfig({
      apps: { blog: false },
      features: { web3: false },
    });
    const resolved = resolveConfig(config);
    // Default: web=true (unchanged)
    expect(resolved.apps.web).toBe(true);
    // Override: blog=false
    expect(resolved.apps.blog).toBe(false);
    // Override: web3=false
    expect(resolved.features.web3).toBe(false);
    // Default: ai=true (unchanged)
    expect(resolved.features.ai).toBe(true);
  });

  it("preserves locales and theme", () => {
    const config = defineConfig({
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

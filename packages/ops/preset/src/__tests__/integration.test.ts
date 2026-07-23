import { describe, expect, it } from "vitest";
import { defineConfig, getActiveApps, getFeatureEnvVars, resolveConfig } from "../index";

describe("config → theme integration", () => {
  it("default config resolves to a valid theme", () => {
    const validThemes = [
      "factory",
      "linear",
      "gsap",
      "raycast",
      "vercel",
      "vanta",
      "stripe",
      "notion",
      "custom",
    ];
    const resolved = resolveConfig(defineConfig({}));
    expect(validThemes).toContain(resolved.theme);
  });

  it("full end-to-end: config → resolve → env vars", () => {
    const config = defineConfig({
      apps: { blog: false },
      features: { web3: false },
      theme: "factory",
      locales: ["en", "zh"],
    });
    const resolved = resolveConfig(config);
    const envVars = getFeatureEnvVars(resolved);
    const activeApps = getActiveApps(resolved);

    // Theme
    expect(envVars.NEBUTRA_THEME).toBe("factory");

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

    // Deploy targets
    expect(envVars.DEPLOY_TARGET_WEB).toBe("vercel");
    expect(envVars.DEPLOY_TARGET_GATEWAY).toBe("cloudflare-workers");
    expect(envVars.DEPLOY_TARGET_PYTHON_AI).toBe("ecs-docker");
  });

  it("user overrides merge correctly on top of defaults", () => {
    const config = defineConfig({
      apps: { web: false },
      features: { ai: false },
      theme: "vanta",
    });
    const resolved = resolveConfig(config);

    // Default (unchanged): landing-page=true
    expect(resolved.apps["landing-page"]).toBe(true);
    // Override: web=false
    expect(resolved.apps.web).toBe(false);
    // Override: ai=false
    expect(resolved.features.ai).toBe(false);
    // Override: theme=vanta
    expect(resolved.theme).toBe("vanta");
  });

  it("preserves provider-switchable deploy target overrides through config to env vars", () => {
    const config = defineConfig({
      deployTargets: {
        gateway: "k8s",
        "python-ai": "aws",
      },
    });
    const resolved = resolveConfig(config);
    const envVars = getFeatureEnvVars(resolved);

    expect(resolved.deployTargets.gateway).toBe("k8s");
    expect(resolved.deployTargets["python-ai"]).toBe("aws");
    expect(resolved.deployTargets.web).toBe("vercel");
    expect(envVars.DEPLOY_TARGET_GATEWAY).toBe("k8s");
    expect(envVars.DEPLOY_TARGET_PYTHON_AI).toBe("aws");
  });
});

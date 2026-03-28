import { describe, expect, it } from "vitest";
import { AppId, FeatureId, type PresetDefinition, PresetId, ThemeId } from "../config";
import { getPreset, presets } from "../presets";

describe("presets", () => {
  const allPresetIds = PresetId.options;
  const allAppIds = AppId.options;
  const allFeatureIds = FeatureId.options;

  it("exports all 10 presets", () => {
    expect(Object.keys(presets)).toHaveLength(10);
    for (const id of allPresetIds) {
      expect(presets[id]).toBeDefined();
    }
  });

  it("each preset has all app keys", () => {
    for (const [_presetId, preset] of Object.entries(presets)) {
      for (const appId of allAppIds) {
        expect(preset.apps).toHaveProperty(appId, expect.any(Boolean));
      }
    }
  });

  it("each preset has all feature keys", () => {
    for (const [_presetId, preset] of Object.entries(presets)) {
      for (const featureId of allFeatureIds) {
        expect(preset.features).toHaveProperty(featureId, expect.any(Boolean));
      }
    }
  });

  it("each preset has a valid theme", () => {
    for (const preset of Object.values(presets)) {
      expect(() => ThemeId.parse(preset.theme)).not.toThrow();
    }
  });

  it("full preset enables all apps and features", () => {
    const full = presets.full as PresetDefinition;
    for (const appId of allAppIds) {
      expect(full.apps[appId]).toBe(true);
    }
    for (const featureId of allFeatureIds) {
      expect(full.features[featureId]).toBe(true);
    }
  });

  describe("getPreset", () => {
    it("returns the correct preset by ID", () => {
      const aiSaas = getPreset("ai-saas");
      expect(aiSaas.id).toBe("ai-saas");
      expect(aiSaas.apps.web).toBe(true);
      expect(aiSaas.features.ai).toBe(true);
    });

    it("throws for invalid preset ID", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => getPreset("invalid" as unknown as any)).toThrow();
    });
  });

  describe("scenario mapping", () => {
    it("ai-saas enables web, landing-page, api-gateway; disables blog", () => {
      const p = presets["ai-saas"] as PresetDefinition;
      expect(p.apps.web).toBe(true);
      expect(p.apps["landing-page"]).toBe(true);
      expect(p.apps["api-gateway"]).toBe(true);
      expect(p.apps.blog).toBe(false);
      expect(p.theme).toBe("neon");
    });

    it("marketing enables landing-page, blog, studio; disables web", () => {
      const p = presets.marketing as PresetDefinition;
      expect(p.apps["landing-page"]).toBe(true);
      expect(p.apps.blog).toBe(true);
      expect(p.apps.studio).toBe(true);
      expect(p.apps.web).toBe(false);
      expect(p.theme).toBe("gradient");
    });

    it("dashboard enables web, admin, api-gateway; enables sso", () => {
      const p = presets.dashboard as PresetDefinition;
      expect(p.apps.web).toBe(true);
      expect(p.apps.admin).toBe(true);
      expect(p.apps["api-gateway"]).toBe(true);
      expect(p.features.sso).toBe(true);
      expect(p.theme).toBe("dark-dense");
    });
  });
});

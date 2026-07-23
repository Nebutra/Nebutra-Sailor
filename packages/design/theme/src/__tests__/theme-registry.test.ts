/**
 * Frozen empty mood registry — internal module only (package export removed).
 */
import { describe, expect, it } from "vitest";
import { LANGUAGE_IDS } from "../languages";
import { DEFAULT_THEME, isThemeId, THEME_IDS, THEME_REGISTRY } from "../registry";

describe("@nebutra/theme registry (frozen empty mood list)", () => {
  it("ships an empty oklch mood list and must stay empty", () => {
    expect(THEME_REGISTRY.themes).toEqual([]);
    expect(THEME_IDS).toEqual([]);
  });

  it("defaults to factory design language", () => {
    expect(DEFAULT_THEME).toBe("factory");
  });

  it("bridges isThemeId to design language ids only", () => {
    for (const id of LANGUAGE_IDS) {
      expect(isThemeId(id)).toBe(true);
    }
    expect(isThemeId("custom")).toBe(true);
    expect(isThemeId("crimson-light-vivid")).toBe(false);
    expect(isThemeId("vibrant")).toBe(false);
  });
});

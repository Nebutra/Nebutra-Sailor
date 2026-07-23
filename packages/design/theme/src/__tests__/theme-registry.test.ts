import { describe, expect, it } from "vitest";
import { LANGUAGE_IDS } from "../languages";
import {
  DEFAULT_THEME,
  getThemeById,
  isThemeId,
  listThemesAsLegacyEntries,
  THEME_IDS,
  THEME_REGISTRY,
} from "../registry";

describe("@nebutra/theme registry (mood catalog removed)", () => {
  it("ships an empty oklch mood list", () => {
    expect(THEME_REGISTRY.themes).toEqual([]);
    expect(THEME_IDS).toEqual([]);
  });

  it("defaults to factory design language", () => {
    expect(DEFAULT_THEME).toBe("factory");
  });

  it("accepts design language ids via isThemeId bridge", () => {
    for (const id of LANGUAGE_IDS) {
      expect(isThemeId(id)).toBe(true);
    }
    expect(isThemeId("custom")).toBe(true);
    expect(isThemeId("crimson-light-vivid")).toBe(false);
    expect(isThemeId("vibrant")).toBe(false);
  });

  it("projects languages for legacy getThemeById callers", () => {
    const vanta = getThemeById("vanta");
    expect(vanta?.category).toBe("design-language");
    expect(vanta?.mood).toMatch(/violet|parchment|Vivid/i);
    expect(getThemeById("missing")).toBeUndefined();
  });

  it("lists all design languages as legacy entries", () => {
    const entries = listThemesAsLegacyEntries();
    expect(entries.map((e) => e.id)).toEqual(LANGUAGE_IDS);
  });
});

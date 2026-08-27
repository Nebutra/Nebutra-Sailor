/**
 * Mood catalog is deleted — only design languages remain.
 * Empty registry shim was removed; assert LANGUAGE_REGISTRY is the sole catalog.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, isLanguageId, LANGUAGE_IDS, LANGUAGE_REGISTRY } from "../languages";

describe("@nebutra/theme — no mood registry", () => {
  it("ships design languages only (factory + skins)", () => {
    expect(DEFAULT_LANGUAGE).toBe("factory");
    expect(LANGUAGE_IDS).toContain("factory");
    expect(LANGUAGE_IDS.length).toBeGreaterThan(1);
    expect(LANGUAGE_REGISTRY.languages.length).toBe(LANGUAGE_IDS.length);
  });

  it("rejects legacy oklch mood ids", () => {
    expect(isLanguageId("crimson-light-vivid")).toBe(false);
    expect(isLanguageId("vibrant")).toBe(false);
    expect(isLanguageId("azure-dark-muted")).toBe(false);
  });

  it("accepts design language ids", () => {
    for (const id of LANGUAGE_IDS) {
      expect(isLanguageId(id)).toBe(true);
    }
  });
});

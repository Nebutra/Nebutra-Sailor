/**
 * Display-data tests for theme-token-data.
 *
 * Application is covered by preview-carrier.test.ts. These tests pin the
 * swatch sources: factory/light/dark read the mode SSOT's `shadcn` group (the
 * DTCG mirror of styles.css), design languages read their Brand Package, and an
 * imported set reads its own `color` group.
 */

import { describe, expect, it } from "vitest";
import {
  channelsToCss,
  getSwatchesFromTokenSet,
  getThemeSwatches,
  type ThemeTokenSet,
} from "../theme-token-data";

describe("channelsToCss", () => {
  it("wraps HSL channel triples the way consumers do", () => {
    expect(channelsToCss("222.8 85% 55.7%", "transparent")).toBe("hsl(222.8 85% 55.7%)");
  });

  it("passes complete colors through untouched", () => {
    expect(channelsToCss("#fff7ed", "transparent")).toBe("#fff7ed");
    expect(channelsToCss("oklch(0.98 0 0)", "transparent")).toBe("oklch(0.98 0 0)");
    expect(channelsToCss("rgb(10 10 10)", "transparent")).toBe("rgb(10 10 10)");
    expect(channelsToCss("hsl(200 50% 60%)", "transparent")).toBe("hsl(200 50% 60%)");
  });

  it("falls back when the value is absent", () => {
    expect(channelsToCss(undefined, "transparent")).toBe("transparent");
    expect(channelsToCss("   ", "transparent")).toBe("transparent");
  });
});

describe("getSwatchesFromTokenSet", () => {
  it("reads the imported set's own color group", () => {
    const tokenSet: ThemeTokenSet = {
      color: {
        primary: { $value: "#ff5a1f", $type: "color" },
        secondary: { $value: "#111111", $type: "color" },
        accent: { $value: "#eeeeee", $type: "color" },
        background: { $value: "#fff7ed", $type: "color" },
        card: { $value: "#ffffff", $type: "color" },
        border: { $value: "#e5e5e5", $type: "color" },
      },
    };
    expect(getSwatchesFromTokenSet(tokenSet)).toEqual([
      "#ff5a1f",
      "#111111",
      "#eeeeee",
      "#fff7ed",
      "#ffffff",
      "#e5e5e5",
    ]);
  });

  it("drops missing keys instead of inventing fallbacks", () => {
    expect(getSwatchesFromTokenSet({})).toEqual([]);
  });
});

describe("getThemeSwatches", () => {
  it("reads factory swatches from the mode SSOT, not a hardcoded palette", () => {
    // light.json shadcn.primary is the House ink, 225 7.7% 10.2% — the same
    // value styles.css declares. The old hardcoded palette carried hsl(228 85% 56%).
    const light = getThemeSwatches("factory", "light");
    expect(light[0]).toBe("hsl(225 7.7% 10.2%)");
    expect(light).toContain("hsl(0 0% 100%)");

    const dark = getThemeSwatches("factory", "dark");
    expect(dark[0]).toBe("hsl(228 23.8% 95.9%)");
    expect(dark[0]).not.toBe(light[0]);
  });

  it("treats the mode aliases as their own mode", () => {
    expect(getThemeSwatches("light")[0]).toBe(getThemeSwatches("factory", "light")[0]);
    expect(getThemeSwatches("dark")[0]).toBe(getThemeSwatches("factory", "dark")[0]);
  });

  it("reads a design language's swatches from its Brand Package", () => {
    // Cosmos: Ink Black #0d0d0d on Linen Canvas #f7f5f3.
    const cosmos = getThemeSwatches("cosmos", "light");
    expect(cosmos[0]).toBe("hsl(0 0% 5%)");
    expect(cosmos[3]).toBe("hsl(30 20% 96%)");
    expect(cosmos[0]).not.toBe(getThemeSwatches("factory", "light")[0]);
  });

  it("falls back to the factory mode palette for unknown ids", () => {
    expect(getThemeSwatches("does-not-exist", "light")).toEqual(
      getThemeSwatches("factory", "light"),
    );
  });
});

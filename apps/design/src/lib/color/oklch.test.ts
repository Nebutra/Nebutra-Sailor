import { describe, expect, it } from "vitest";
import { formatOklch, hexToOklch, inSrgbGamut, normalizeHex, oklchToHex } from "./oklch";

describe("normalizeHex", () => {
  it("accepts 3- and 6-digit hex with or without the hash, any case", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("2e65ee")).toBe("#2e65ee");
    expect(normalizeHex("  #2E65EE ")).toBe("#2e65ee");
  });

  it("rejects anything that is not a colour", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#12")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("#gggggg")).toBeNull();
    expect(normalizeHex("blue")).toBeNull();
  });
});

describe("hexToOklch", () => {
  it("places white and black on the lightness axis with no chroma", () => {
    const white = hexToOklch("#ffffff");
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeLessThan(0.0005);
    const black = hexToOklch("#000000");
    expect(black.l).toBeCloseTo(0, 5);
    expect(black.c).toBeLessThan(0.0005);
  });

  // Reference values from the CSS Color 4 / Ottosson OKLab definition.
  it("matches the published OKLCH of the sRGB primaries", () => {
    const red = hexToOklch("#ff0000");
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
    const blue = hexToOklch("#0000ff");
    expect(blue.l).toBeCloseTo(0.452, 3);
    expect(blue.c).toBeCloseTo(0.3132, 3);
    expect(blue.h).toBeCloseTo(264.05, 1);
  });

  it("keeps hue inside 0…360", () => {
    for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#ff00ff", "#ffff00", "#00ffff"]) {
      const { h } = hexToOklch(hex);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });
});

describe("oklchToHex", () => {
  it("round-trips in-gamut colours exactly", () => {
    for (const hex of [
      "#2e65ee",
      "#e5484d",
      "#30a46c",
      "#ffc53d",
      "#808080",
      "#010203",
      "#fafcfe",
    ]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("maps an out-of-gamut request into sRGB by reducing chroma, keeping L and hue", () => {
    const wanted = { l: 0.7, c: 0.4, h: 150 };
    expect(inSrgbGamut(wanted)).toBe(false);
    const hex = oklchToHex(wanted);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const got = hexToOklch(hex);
    expect(got.l).toBeCloseTo(wanted.l, 1);
    expect(got.c).toBeLessThan(wanted.c);
    expect(Math.abs(got.h - wanted.h)).toBeLessThan(3);
  });

  it("clamps lightness outside 0…1 rather than throwing", () => {
    expect(oklchToHex({ l: 1.4, c: 0.1, h: 20 })).toBe("#ffffff");
    expect(oklchToHex({ l: -0.2, c: 0.1, h: 20 })).toBe("#000000");
  });
});

describe("inSrgbGamut", () => {
  it("is true for colours that came from sRGB and false past the gamut edge", () => {
    expect(inSrgbGamut(hexToOklch("#0000ff"))).toBe(true);
    expect(inSrgbGamut({ l: 0.5, c: 0.35, h: 200 })).toBe(false);
  });
});

describe("formatOklch", () => {
  it("prints the CSS oklch() function with trimmed precision", () => {
    expect(formatOklch({ l: 0.555123, c: 0.2150001, h: 264.04 })).toBe(
      "oklch(0.5551 0.215 264.04)",
    );
  });

  it("prints achromatic hue as 0 rather than NaN", () => {
    expect(formatOklch({ l: 1, c: 0, h: Number.NaN })).toBe("oklch(1 0 0)");
  });
});

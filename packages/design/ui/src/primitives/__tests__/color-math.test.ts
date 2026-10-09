import { describe, expect, it } from "vitest";
import {
  formatColor,
  hexToHsva,
  hsvToRgb,
  isHex,
  oklchToRgb,
  parseColor,
  parseHex,
  rgbaToHex,
  rgbToHsv,
  rgbToOklch,
} from "../color-math";

const SAMPLES = [
  "#000000",
  "#ffffff",
  "#2e65ee",
  "#0bf1c3",
  "#8b5cf6",
  "#f59e0b",
  "#7f7f7f",
  "#123456",
];

describe("hex parsing", () => {
  it("accepts 3, 4, 6 and 8 digits with or without #", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex("0033FE")).toEqual({ r: 0, g: 51, b: 254, a: 1 });
    expect(parseHex("#f008")?.a).toBeCloseTo(0.533, 2);
    expect(parseHex("#00000080")?.a).toBeCloseTo(0.502, 2);
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "#", "#12", "#12345", "#1234567", "#ggg", "blue", "#12 456"]) {
      expect(isHex(bad), bad).toBe(false);
      expect(parseHex(bad), bad).toBeNull();
    }
  });
});

describe("round trips", () => {
  it("hex -> hsv -> rgb -> hex is lossless", () => {
    for (const hex of SAMPLES) {
      const rgba = parseHex(hex);
      if (!rgba) throw new Error(hex);
      expect(rgbaToHex({ ...hsvToRgb(rgbToHsv(rgba)), a: 1 })).toBe(hex);
    }
  });

  it("rgb -> oklch -> rgb stays within one 8-bit step", () => {
    for (const hex of SAMPLES) {
      const rgba = parseHex(hex);
      if (!rgba) throw new Error(hex);
      const back = oklchToRgb(rgbToOklch(rgba));
      expect(Math.abs(back.r - rgba.r)).toBeLessThan(1);
      expect(Math.abs(back.g - rgba.g)).toBeLessThan(1);
      expect(Math.abs(back.b - rgba.b)).toBeLessThan(1);
    }
  });

  it("matches known OKLCH anchors", () => {
    const white = rgbToOklch({ r: 255, g: 255, b: 255 });
    expect(white.l).toBeCloseTo(1, 2);
    expect(white.c).toBeLessThan(0.001);
    const red = rgbToOklch({ r: 255, g: 0, b: 0 });
    expect(red.l).toBeCloseTo(0.628, 2);
    expect(red.c).toBeCloseTo(0.258, 2);
    expect(red.h).toBeCloseTo(29.2, 0);
  });

  it("keeps alpha through 8-digit hex", () => {
    const hsva = hexToHsva("#0bf1c380");
    expect(hsva?.a).toBeCloseTo(0.502, 2);
    expect(rgbaToHex({ r: 11, g: 241, b: 195, a: 0.502 }, true)).toBe("#0bf1c380");
    expect(rgbaToHex({ r: 11, g: 241, b: 195, a: 1 }, true)).toBe("#0bf1c3");
  });
});

describe("typed formats", () => {
  it("parses rgb() in comma, space and slash-alpha forms", () => {
    expect(parseColor("rgb(46, 101, 238)")).toMatchObject({ r: 46, g: 101, b: 238 });
    expect(parseColor("46 101 238", "rgb")).toMatchObject({ r: 46, g: 101, b: 238 });
    expect(parseColor("rgb(46 101 238 / 50%)")?.a).toBeCloseTo(0.5);
    expect(parseColor("rgb(300 0 0)")).toBeNull();
  });

  it("parses oklch() and rejects out-of-range values", () => {
    const parsed = parseColor("oklch(62.8% 0.258 29.2)");
    expect(parsed?.r).toBeGreaterThan(250);
    expect(parseColor("oklch(150% 0.1 20)")).toBeNull();
    expect(parseColor("nonsense", "oklch")).toBeNull();
  });

  it("formats each notation", () => {
    const c = { r: 46, g: 101, b: 238, a: 1 };
    expect(formatColor(c, "hex")).toBe("#2e65ee");
    expect(formatColor(c, "rgb")).toBe("rgb(46 101 238)");
    expect(formatColor(c, "oklch")).toMatch(/^oklch\(\d+(\.\d)?% 0\.\d+ \d+(\.\d)?\)$/);
    expect(formatColor({ ...c, a: 0.5 }, "rgb", true)).toBe("rgb(46 101 238 / 0.5)");
  });
});

import { describe, expect, it } from "vitest";
import { toCssVariables, toDtcg } from "./export";
import { generatePalette } from "./scale";

const palette = generatePalette("#2e65ee");

describe("toCssVariables", () => {
  const css = toCssVariables(palette, "brand");

  it("declares twelve oklch() custom properties per mode under the given name", () => {
    for (let step = 1; step <= 12; step += 1) {
      expect(css).toContain(`--brand-${step}: oklch(`);
    }
    expect(css.match(/--brand-\d+:/g)).toHaveLength(24);
  });

  it("scopes light to :root and dark to .dark, matching the site's theme switch", () => {
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/\.dark\s*\{/);
  });

  it("emits the on-solid ink as its own variable per mode", () => {
    expect(css.match(/--brand-contrast:/g)).toHaveLength(2);
  });

  it("rejects a name that is not a valid custom-property fragment", () => {
    expect(() => toCssVariables(palette, "Bad Name!")).toThrow(/name/i);
  });
});

describe("toDtcg", () => {
  const tokens = JSON.parse(toDtcg(palette, "brand"));

  it("is a DTCG group tree typed as color", () => {
    expect(tokens.brand.$type).toBe("color");
    expect(Object.keys(tokens.brand.light)).toHaveLength(12);
    expect(Object.keys(tokens.brand.dark)).toHaveLength(12);
  });

  it("stores each colour as an oklch components object with a hex fallback", () => {
    const value = tokens.brand.light["9"].$value;
    expect(value.colorSpace).toBe("oklch");
    expect(value.components).toHaveLength(3);
    expect(value.hex).toBe("#2e65ee");
  });

  it("describes each step by its role", () => {
    expect(tokens.brand.light["11"].$description).toMatch(/text/i);
  });
});

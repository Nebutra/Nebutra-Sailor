import { describe, expect, it } from "vitest";
import { apcaLc, wcagContrast } from "./contrast";

describe("wcagContrast", () => {
  it("is 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(wcagContrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(wcagContrast("#2e65ee", "#2e65ee")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(wcagContrast("#2e65ee", "#fafcfe")).toBeCloseTo(wcagContrast("#fafcfe", "#2e65ee"), 8);
  });

  it("matches the published ratio for #767676 on white (the 4.54:1 AA boundary)", () => {
    expect(wcagContrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe("apcaLc", () => {
  // APCA-W3 0.0.98G-4g reference points.
  it("reads black text on white as about +106 and white on black as about -108", () => {
    expect(apcaLc("#000000", "#ffffff")).toBeCloseTo(106.04, 1);
    expect(apcaLc("#ffffff", "#000000")).toBeCloseTo(-107.88, 1);
  });

  it("is zero for identical colours", () => {
    expect(apcaLc("#2e65ee", "#2e65ee")).toBe(0);
  });

  it("is polarity-aware: the same pair differs by direction, unlike WCAG", () => {
    const dark = apcaLc("#2e65ee", "#fafcfe");
    const light = apcaLc("#fafcfe", "#2e65ee");
    expect(dark).toBeGreaterThan(0);
    expect(light).toBeLessThan(0);
    expect(Math.abs(dark)).not.toBeCloseTo(Math.abs(light), 0);
  });

  it("returns 0 for pairs below the APCA noise floor", () => {
    expect(apcaLc("#f0f0f0", "#f2f2f2")).toBe(0);
  });
});

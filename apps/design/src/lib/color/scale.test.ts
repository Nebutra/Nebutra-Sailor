import { describe, expect, it } from "vitest";
import { wcagContrast } from "./contrast";
import { hexToOklch } from "./oklch";
import { evaluatePairs, generatePalette, generateScale, PAIRS, STEP_ROLES } from "./scale";

/** Seeds spanning the cases a ladder has to survive: hue, bright, dark, near-grey. */
const SEEDS = {
  blue: "#2e65ee",
  red: "#e5484d",
  green: "#30a46c",
  orange: "#f76b15",
  yellow: "#ffe629",
  violet: "#6e56cf",
  nearGrey: "#8b8d98",
  veryDark: "#1a2333",
  veryBright: "#f5f9a8",
} as const;

/**
 * The hand-tuned `--blue-1…12` light ladder, as OKLCH [L, C]. The generator is
 * not meant to reproduce it digit for digit — it is meant to land in the same
 * place, which is what "aligned with our semantics" has to mean to be testable.
 */
const BLUE_LIGHT: [number, number][] = [
  [0.99, 0.003],
  [0.972, 0.01],
  [0.948, 0.02],
  [0.917, 0.034],
  [0.878, 0.052],
  [0.796, 0.093],
  [0.716, 0.134],
  [0.635, 0.175],
  [0.555, 0.215],
  [0.495, 0.205],
  [0.42, 0.18],
  [0.239, 0.115],
];

const BLUE_DARK: [number, number][] = [
  [0.136, 0.031],
  [0.174, 0.048],
  [0.22, 0.071],
  [0.27, 0.095],
  [0.325, 0.118],
  [0.383, 0.136],
  [0.442, 0.155],
  [0.5, 0.173],
  [0.559, 0.191],
  [0.574, 0.183],
  [0.74, 0.106],
  [0.905, 0.043],
];

describe("STEP_ROLES", () => {
  it("names twelve steps in the Radix-style order the --blue-N tokens follow", () => {
    expect(STEP_ROLES.map((role) => role.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(STEP_ROLES[0]?.label).toMatch(/background/i);
    expect(STEP_ROLES[8]?.label).toMatch(/solid/i);
    expect(STEP_ROLES[10]?.label).toMatch(/text/i);
  });
});

describe("generateScale", () => {
  it("returns twelve steps of valid hex with their roles attached", () => {
    const steps = generateScale(SEEDS.blue, "light");
    expect(steps).toHaveLength(12);
    for (const [index, step] of steps.entries()) {
      expect(step.step).toBe(index + 1);
      expect(step.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(step.role).toBe(STEP_ROLES[index]?.id);
    }
  });

  it("throws on an input that is not a colour instead of inventing one", () => {
    expect(() => generateScale("nope", "light")).toThrow(/hex/i);
  });

  it("uses the seed as the solid step in light mode", () => {
    for (const hex of Object.values(SEEDS)) {
      expect(generateScale(hex, "light")[8]?.hex).toBe(hex);
    }
  });

  it("runs light mode from near-white down to near-black", () => {
    const steps = generateScale(SEEDS.blue, "light");
    const lightness = steps.map((step) => step.oklch.l);
    for (let i = 1; i < 12; i += 1) {
      expect(lightness[i]).toBeLessThan(lightness[i - 1] as number);
    }
    expect(lightness[0]).toBeGreaterThan(0.97);
    expect(lightness[11]).toBeLessThan(0.3);
  });

  it("runs dark mode from near-black up to near-white, solid steps excepted", () => {
    const steps = generateScale(SEEDS.blue, "dark");
    const lightness = steps.map((step) => step.oklch.l);
    for (let i = 1; i < 12; i += 1) {
      expect(lightness[i]).toBeGreaterThan(lightness[i - 1] as number);
    }
    expect(lightness[0]).toBeLessThan(0.2);
    expect(lightness[11]).toBeGreaterThan(0.85);
  });

  it("keeps one hue across the ladder", () => {
    const seedHue = hexToOklch(SEEDS.blue).h;
    for (const mode of ["light", "dark"] as const) {
      for (const step of generateScale(SEEDS.blue, mode).slice(2)) {
        expect(Math.abs(step.oklch.h - seedHue)).toBeLessThan(4);
      }
    }
  });

  it("lands near the hand-tuned blue ladder in both modes", () => {
    const cases = [
      ["light", BLUE_LIGHT],
      ["dark", BLUE_DARK],
    ] as const;
    for (const [mode, target] of cases) {
      const steps = generateScale(SEEDS.blue, mode);
      for (const [index, [l, c]] of target.entries()) {
        const step = steps[index];
        expect(Math.abs((step?.oklch.l ?? 0) - l), `${mode} step ${index + 1} L`).toBeLessThan(
          0.035,
        );
        expect(Math.abs((step?.oklch.c ?? 0) - c), `${mode} step ${index + 1} C`).toBeLessThan(
          0.03,
        );
      }
    }
  });

  it("reproduces the shipped --blue ladder to within 2/255 per channel from its own solid", () => {
    // Values copied from the built token CSS (light.css / dark.css). The dark
    // solid (steps 6–10) is deliberately a different, quieter blue than the
    // light one, so the seed cannot reproduce those five — and should not.
    const light = [
      "#fafcfe",
      "#f2f6fd",
      "#e7eefc",
      "#d8e4fb",
      "#c6d7fa",
      "#9fbcf9",
      "#79a1f7",
      "#5384f3",
      "#2e65ee",
      "#2253d4",
      "#1740ad",
      "#031654",
    ];
    const dark = [
      "#030815",
      "#060f25",
      "#09183b",
      "#0d2254",
      "#132e6f",
      "#1c3c8a",
      "#254ba7",
      "#2f5ac4",
      "#396ae2",
      "#3f70e3",
      "#89aaee",
      "#d2e0fd",
    ];
    const channelGap = (a: string, b: string) =>
      Math.max(
        ...[1, 3, 5].map((k) =>
          Math.abs(Number.parseInt(a.slice(k, k + 2), 16) - Number.parseInt(b.slice(k, k + 2), 16)),
        ),
      );
    const generatedLight = generateScale(SEEDS.blue, "light");
    for (const [index, hex] of light.entries()) {
      expect(
        channelGap(generatedLight[index]?.hex ?? "", hex),
        `light ${index + 1}`,
      ).toBeLessThanOrEqual(2);
    }
    const generatedDark = generateScale(SEEDS.blue, "dark");
    for (const index of [0, 1, 2, 3, 4, 10, 11]) {
      expect(
        channelGap(generatedDark[index]?.hex ?? "", dark[index] ?? ""),
        `dark ${index + 1}`,
      ).toBeLessThanOrEqual(2);
    }
  });

  it("never lets the dark solid step leave a range white text can sit on", () => {
    for (const hex of Object.values(SEEDS)) {
      const solid = generateScale(hex, "dark")[8];
      expect(solid?.oklch.l).toBeGreaterThanOrEqual(0.5);
      expect(solid?.oklch.l).toBeLessThanOrEqual(0.8);
    }
  });

  it("guarantees the text steps clear AA on the subtle background, for every seed", () => {
    for (const [name, hex] of Object.entries(SEEDS)) {
      for (const mode of ["light", "dark"] as const) {
        const steps = generateScale(hex, mode);
        const bg = steps[1]?.hex ?? "";
        expect(
          wcagContrast(steps[10]?.hex ?? "", bg),
          `${name} ${mode} 11/2`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          wcagContrast(steps[11]?.hex ?? "", bg),
          `${name} ${mode} 12/2`,
        ).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it("is deterministic", () => {
    expect(generateScale(SEEDS.violet, "light")).toEqual(generateScale(SEEDS.violet, "light"));
  });
});

describe("generatePalette", () => {
  it("returns both modes for a normalised seed", () => {
    const palette = generatePalette("#2E65EE");
    expect(palette.seed).toBe("#2e65ee");
    expect(palette.light).toHaveLength(12);
    expect(palette.dark).toHaveLength(12);
  });
});

describe("evaluatePairs", () => {
  it("scores every declared pair with both WCAG 2 and APCA", () => {
    const results = evaluatePairs(generateScale(SEEDS.blue, "light"));
    expect(results).toHaveLength(PAIRS.length);
    for (const result of results) {
      expect(result.wcag).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(result.apca)).toBe(true);
      expect(result.fg).toMatch(/^#[0-9a-f]{6}$/);
      expect(result.bg).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("reports a miss instead of hiding it: a pale solid is not a 3:1 graphic on the app background", () => {
    const pair = evaluatePairs(generateScale(SEEDS.veryBright, "light")).find(
      (result) => result.id === "solid-graphic",
    );
    expect(pair?.passesWcag).toBe(false);
    expect(pair?.passesApca).toBe(false);
  });

  it("derives pass flags from the pair's own thresholds", () => {
    for (const result of evaluatePairs(generateScale(SEEDS.yellow, "light"))) {
      expect(result.passesWcag).toBe(result.wcag >= result.wcagMin);
      expect(result.passesApca).toBe(Math.abs(result.apca) >= result.apcaMin);
    }
  });

  it("chooses the on-solid ink that contrasts better", () => {
    const yellow = evaluatePairs(generateScale(SEEDS.yellow, "light")).find(
      (result) => result.id === "on-solid",
    );
    const blue = evaluatePairs(generateScale(SEEDS.blue, "light")).find(
      (result) => result.id === "on-solid",
    );
    // Dark ink on yellow, light ink on blue.
    expect(hexToOklch(yellow?.fg ?? "").l).toBeLessThan(0.5);
    expect(hexToOklch(blue?.fg ?? "").l).toBeGreaterThan(0.9);
    expect(yellow?.passesWcag).toBe(true);
    expect(blue?.passesWcag).toBe(true);
  });
});

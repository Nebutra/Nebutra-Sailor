/**
 * WCAG 2.1 contrast ratio architecture tests.
 *
 * Reads the token source of truth (packages/tokens/styles.css), extracts
 * key foreground/background color pairs, computes WCAG relative-luminance
 * contrast ratios, and asserts AA compliance:
 *   - Normal text: ≥ 4.5:1
 *   - Large text:  ≥ 3:1
 *
 * Token hex values are resolved from the CSS custom property chain so
 * this test catches regressions whenever token values change.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const TOKEN_FILE = resolve(ROOT, "packages/tokens/styles.css");

// ---------------------------------------------------------------------------
// Helpers — WCAG 2.1 contrast computation
// ---------------------------------------------------------------------------

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Parse a hex color string (#RGB, #RRGGBB, or #RRGGBBAA) into {r, g, b}
 * with channel values in [0, 255].
 */
function hexToRgb(hex: string): Rgb {
  const cleaned = hex.replace(/^#/, "");

  let r: number;
  let g: number;
  let b: number;

  if (cleaned.length === 3 || cleaned.length === 4) {
    r = parseInt((cleaned[0] ?? "0") + (cleaned[0] ?? "0"), 16);
    g = parseInt((cleaned[1] ?? "0") + (cleaned[1] ?? "0"), 16);
    b = parseInt((cleaned[2] ?? "0") + (cleaned[2] ?? "0"), 16);
  } else if (cleaned.length === 6 || cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b };
}

/**
 * Compute WCAG 2.1 relative luminance from sRGB channel values (0–255).
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

/**
 * Compute contrast ratio between two relative luminance values.
 * Result is always ≥ 1 (lighter / darker).
 */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Token resolution from CSS source
// ---------------------------------------------------------------------------

/**
 * Build a flat map of CSS custom property name → raw value from the :root
 * block in the token file.
 *
 * Handles both literal values (`--neutral-1: #ffffff`) and var references
 * (`--neutral-2: var(--nebutra-neutral-50)`) by resolving one level of
 * indirection.
 */
function resolveTokens(): Map<string, string> {
  const css = readFileSync(TOKEN_FILE, "utf-8");
  const map = new Map<string, string>();

  // Extract all custom property declarations (ignoring comments).
  const propPattern = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;

  while ((match = propPattern.exec(css)) !== null) {
    const name = `--${match[1]}`;
    const value = match[2]?.trim();
    map.set(name, value);
  }

  return map;
}

/**
 * Resolve a token name to its final hex value, following var() references
 * up to 5 levels deep.
 */
function resolveHex(tokens: Map<string, string>, name: string): string {
  let value = tokens.get(name);
  if (!value) throw new Error(`Token "${name}" not found in ${TOKEN_FILE}`);

  let depth = 0;
  while (value.startsWith("var(") && depth < 5) {
    const inner = value.match(/var\((--[\w-]+)\)/);
    if (!inner) break;
    const resolved = tokens.get(inner[1] ?? "");
    if (!resolved) break;
    value = resolved;
    depth++;
  }

  if (!value.startsWith("#")) {
    throw new Error(
      `Token "${name}" resolved to "${value}" which is not a hex color. ` +
        `Cannot compute contrast ratio for non-hex values.`,
    );
  }

  return value;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function computePairContrast(
  tokens: Map<string, string>,
  fgToken: string,
  bgToken: string,
): { ratio: number; fgHex: string; bgHex: string } {
  const fgHex = resolveHex(tokens, fgToken);
  const bgHex = resolveHex(tokens, bgToken);

  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);

  const fgLum = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  return { ratio: contrastRatio(fgLum, bgLum), fgHex, bgHex };
}

/**
 * Compute contrast ratio using a hardcoded hex value for either fg or bg.
 * Useful when one side is a literal color (e.g. white #ffffff).
 */
function computeHexContrast(
  tokens: Map<string, string>,
  fgTokenOrHex: string,
  bgTokenOrHex: string,
): { ratio: number; fgHex: string; bgHex: string } {
  const fgHex = fgTokenOrHex.startsWith("#") ? fgTokenOrHex : resolveHex(tokens, fgTokenOrHex);
  const bgHex = bgTokenOrHex.startsWith("#") ? bgTokenOrHex : resolveHex(tokens, bgTokenOrHex);

  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);

  const fgLum = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  return { ratio: contrastRatio(fgLum, bgLum), fgHex, bgHex };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WCAG 2.1 Contrast Ratio Compliance", () => {
  const tokens = resolveTokens();

  describe("AA Normal Text (≥ 4.5:1)", () => {
    it("--neutral-12 on --neutral-1 (primary text on app background)", () => {
      const { ratio, fgHex, bgHex } = computePairContrast(tokens, "--neutral-12", "--neutral-1");
      expect(
        ratio,
        `Contrast ${ratio.toFixed(2)}:1 for ${fgHex} on ${bgHex} — ` +
          `WCAG AA requires ≥ 4.5:1 for normal text`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("--neutral-11 on --neutral-1 (secondary text on app background)", () => {
      const { ratio, fgHex, bgHex } = computePairContrast(tokens, "--neutral-11", "--neutral-1");
      expect(
        ratio,
        `Contrast ${ratio.toFixed(2)}:1 for ${fgHex} on ${bgHex} — ` +
          `WCAG AA requires ≥ 4.5:1 for normal text`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("--neutral-12 on --neutral-2 (primary text on subtle background)", () => {
      const { ratio, fgHex, bgHex } = computePairContrast(tokens, "--neutral-12", "--neutral-2");
      expect(
        ratio,
        `Contrast ${ratio.toFixed(2)}:1 for ${fgHex} on ${bgHex} — ` +
          `WCAG AA requires ≥ 4.5:1 for normal text`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("AA Large Text (≥ 3:1)", () => {
    it("--blue-9 on white (primary accent on white background)", () => {
      const { ratio, fgHex, bgHex } = computeHexContrast(tokens, "--blue-9", "#ffffff");
      expect(
        ratio,
        `Contrast ${ratio.toFixed(2)}:1 for ${fgHex} on ${bgHex} — ` +
          `WCAG AA requires ≥ 3:1 for large text`,
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Helper unit tests", () => {
    it("hexToRgb parses 6-digit hex correctly", () => {
      expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("hexToRgb parses 3-digit shorthand hex correctly", () => {
      expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("relativeLuminance returns 0 for black, 1 for white", () => {
      expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 5);
      expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
    });

    it("contrastRatio of black on white is 21:1", () => {
      const black = relativeLuminance(0, 0, 0);
      const white = relativeLuminance(255, 255, 255);
      expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
    });

    it("contrastRatio of same color is 1:1", () => {
      const mid = relativeLuminance(128, 128, 128);
      expect(contrastRatio(mid, mid)).toBeCloseTo(1, 5);
    });
  });
});

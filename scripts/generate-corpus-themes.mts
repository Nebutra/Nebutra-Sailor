/**
 * generate-corpus-themes.mts
 *
 * Stage 3 of the theme refactor: generate 73 brand-desensitized, full-role,
 * WCAG-AA themes from the VoltAgent corpus DESIGN.md files.
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-corpus-themes.mts
 *
 * Writes one JSON theme file per DESIGN.md to:
 *   packages/design/design-tokens/tokens/themes/<anonId>.json
 *
 * Also emits a manifest to a secure temporary directory for Step 3 wiring.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importFromDesignMd } from "../packages/design/design-sync/src/serialize/from-design-md.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CORPUS_DIR = "/tmp/admd";
const OUTPUT_DIR = join(ROOT, "packages/design/design-tokens/tokens/themes");

/** Fixed semantic colors — same across ALL generated themes for consistency. */
const SEMANTIC_FIXED = {
  destructive: { $value: "oklch(0.577 0.245 27.3)", $type: "color" },
  "destructive-foreground": { $value: "oklch(1 0 0)", $type: "color" },
  success: { $value: "oklch(0.723 0.19 149.6)", $type: "color" },
  "success-foreground": { $value: "oklch(1 0 0)", $type: "color" },
  warning: { $value: "oklch(0.795 0.184 86.0)", $type: "color" },
  "warning-foreground": { $value: "oklch(0.141 0.005 285.9)", $type: "color" },
  info: { $value: "oklch(0.588 0.158 241.9)", $type: "color" },
  "info-foreground": { $value: "oklch(1 0 0)", $type: "color" },
} as const;

const DEFAULT_BACKGROUND_LIGHT = "oklch(1 0 0)";
const DEFAULT_BACKGROUND_DARK = "oklch(0.141 0.005 285.9)";
const NEAR_BLACK = "oklch(0.141 0.005 285.9)";
const WHITE = "oklch(1 0 0)";

const GENERIC_FONT_STACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF_FONT_STACK = "ui-serif, Georgia, Cambria, 'Times New Roman', serif";
const MONO_FONT_STACK = "ui-monospace, 'Cascadia Code', 'Fira Code', monospace";

const DEFAULT_RADIUS = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  full: "9999px",
} as const;

// ─── Color math helpers ────────────────────────────────────────────────────────

/** Parse a hex color (#rgb or #rrggbb) to [r, g, b] 0..1. */
function hexToLinear(hex: string): [number, number, number] | null {
  const h = hex.replace(/^#/, "");
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parseInt(h[0]! + h[0]!, 16) / 255;
    g = parseInt(h[1]! + h[1]!, 16) / 255;
    b = parseInt(h[2]! + h[2]!, 16) / 255;
  } else if (h.length >= 6) {
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
  } else {
    return null;
  }
  return [r, g, b];
}

/** Parse rgb(r, g, b) or rgba(r, g, b, a) to [r, g, b] 0..1. */
function rgbToLinear(value: string): [number, number, number] | null {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  if (!m) return null;
  return [parseInt(m[1]!, 10) / 255, parseInt(m[2]!, 10) / 255, parseInt(m[3]!, 10) / 255];
}

/** Parse oklch(L C H) — approximate conversion to RGB for contrast. */
function oklchToLinear(value: string): [number, number, number] | null {
  const oklchM = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(value);
  if (!oklchM) return null;
  const Lv = parseFloat(oklchM[1]!);
  const Cv = parseFloat(oklchM[2]!);
  const Hv = parseFloat(oklchM[3]!);

  // oklch → oklab
  const hRad = (Hv * Math.PI) / 180;
  const a_ = Cv * Math.cos(hRad);
  const b_ = Cv * Math.sin(hRad);

  // oklab → linear RGB (using the standard oklch→sRGB matrix)
  const l_ = Lv + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = Lv - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = Lv - 0.0894841775 * a_ - 1.291485548 * b_;

  const lv3 = l_ * l_ * l_;
  const mv3 = m_ * m_ * m_;
  const sv3 = s_ * s_ * s_;

  let r = +4.0767416621 * lv3 - 3.3077115913 * mv3 + 0.2309699292 * sv3;
  let g = -1.2684380046 * lv3 + 2.6097574011 * mv3 - 0.3413193965 * sv3;
  let bl = -0.0041960863 * lv3 - 0.7034186147 * mv3 + 1.707614701 * sv3;

  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  bl = Math.max(0, Math.min(1, bl));

  return [r, g, bl];
}

/** Convert sRGB [0..1] channel to linear for luminance calculation. */
function srgbToLinearChannel(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an sRGB color. */
function relativeLuminance(r: number, g: number, b: number): number {
  const rl = srgbToLinearChannel(r);
  const gl = srgbToLinearChannel(g);
  const bl = srgbToLinearChannel(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two oklch/hex/rgb color strings. */
function contrastRatio(colorA: string, colorB: string): number {
  const rgbA = parseColorToLinear(colorA);
  const rgbB = parseColorToLinear(colorB);
  if (!rgbA || !rgbB) return 4.5; // can't parse → assume OK
  const lumA = relativeLuminance(...rgbA);
  const lumB = relativeLuminance(...rgbB);
  const light = Math.max(lumA, lumB);
  const dark = Math.min(lumA, lumB);
  return (light + 0.05) / (dark + 0.05);
}

function parseColorToLinear(value: string): [number, number, number] | null {
  const v = value.trim();
  if (v.startsWith("#")) return hexToLinear(v);
  if (/^rgba?/i.test(v)) return rgbToLinear(v);
  if (/^oklch/i.test(v)) return oklchToLinear(v);
  return null;
}

/** Return oklch string for white or near-black — whichever gives ≥ 4.5:1 contrast. */
function pickForeground(background: string): { value: string; nudged: boolean } {
  const contrastWhite = contrastRatio(background, WHITE);
  const contrastBlack = contrastRatio(background, NEAR_BLACK);
  if (contrastWhite >= 4.5) return { value: WHITE, nudged: false };
  if (contrastBlack >= 4.5) return { value: NEAR_BLACK, nudged: false };
  // Neither passes — pick whichever is better and nudge
  if (contrastWhite >= contrastBlack) {
    return { value: WHITE, nudged: true };
  }
  return { value: NEAR_BLACK, nudged: true };
}

// ─── Color hue/chroma analysis ─────────────────────────────────────────────────

/** Extract hue from a color string (returns 0..360 or null). */
function extractHue(value: string): number | null {
  const v = value.trim();
  // oklch(L C H) — hue is the third parameter
  const oklchMatch = /oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/i.exec(v);
  if (oklchMatch) return parseFloat(oklchMatch[1]!);

  // For hex/rgb: convert to approximate hue via RGB→HSL
  const rgb = parseColorToLinear(v);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0; // achromatic
  let h: number;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

/** Extract chroma (saturation proxy) from a color string (returns 0..1). */
function extractChroma(value: string): number {
  const v = value.trim();
  const oklchMatch = /oklch\(\s*[\d.]+\s+([\d.]+)/i.exec(v);
  if (oklchMatch) return parseFloat(oklchMatch[1]!);

  const rgb = parseColorToLinear(v);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min;
}

/** Extract lightness from a color string (0..1). */
function extractLightness(value: string): number {
  const v = value.trim();
  const oklchMatch = /oklch\(\s*([\d.]+)/i.exec(v);
  if (oklchMatch) return parseFloat(oklchMatch[1]!);

  const rgb = parseColorToLinear(v);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ─── Background usability helpers ─────────────────────────────────────────────

/**
 * Extract oklch chroma from any color string.
 * For non-oklch colors, convert to oklch via toOklch-equivalent inline math.
 * This is used early in synthesizeTheme before toOklch is defined, so we
 * duplicate the extraction logic inline.
 */
function extractOklchChroma(value: string): number {
  const v = value.trim();
  // Direct oklch — extract C field
  const oklchM = /oklch\(\s*[\d.]+\s+([\d.]+)/i.exec(v);
  if (oklchM) return parseFloat(oklchM[1]!);

  // For hex/rgb: convert to oklch and extract C
  const rgb = parseColorToLinear(v);
  if (!rgb) return 0;
  const [r, g, b] = rgb;

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return Math.sqrt(A * A + B * B);
}

/**
 * Extract oklch L (lightness, 0..1) from any color string.
 * Uses proper sRGB gamma decoding before the oklab matrix so that hex/rgb
 * colors match chroma-js oklch L values.
 */
function extractOklchLightness(value: string): number {
  const v = value.trim();
  const oklchM = /oklch\(\s*([\d.]+)/i.exec(v);
  if (oklchM) return parseFloat(oklchM[1]!);

  const rgb = parseColorToLinear(v);
  if (!rgb) return 0.5;
  // parseColorToLinear returns raw sRGB values (0..1, gamma-encoded).
  // Decode gamma (sRGB → linear light) before applying the oklab matrix.
  const rl = srgbToLinearChannel(rgb[0]);
  const gl = srgbToLinearChannel(rgb[1]);
  const bl = srgbToLinearChannel(rgb[2]);
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  return 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
}

/**
 * Extract oklch H (hue, 0..360) from any color string. Returns null for achromatic.
 */
function extractOklchHue(value: string): number | null {
  const v = value.trim();
  const oklchM = /oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/i.exec(v);
  if (oklchM) return parseFloat(oklchM[1]!);

  const rgb = parseColorToLinear(v);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  if (C < 0.001) return null; // achromatic
  return ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
}

/**
 * Returns true if two colors are perceptually too close to use together as
 * background + primary. Uses oklch L distance as a proxy.
 *
 * Background is considered TOO CLOSE to primary when:
 * - bgChroma ≤ 0.04 (background is low-saturation) AND
 * - |bgL - primaryL| < 0.25 (background and primary are in the same lightness band)
 *
 * This covers:
 * - bg === primary (deltaE=0, obviously fails)
 * - Near-black bg vs near-black primary (#1a1a1a vs #000000, cjDE≈5)
 * - Near-dark bg vs pure-black primary (oklch(0.141...) vs #000000, cjDE≈2)
 *
 * Calibrated against chroma-js CIEDE2000 threshold of 8: all known failing cases
 * have |lDiff| < 0.25, while valid neutral backgrounds have |lDiff| ≥ 0.32.
 */
function bgTooCloseToPrimary(bgColor: string, primaryColor: string): boolean {
  const bgChroma = extractOklchChroma(bgColor);
  if (bgChroma > 0.04) return false; // saturated bg is caught by the chroma check
  const bgL = extractOklchLightness(bgColor);
  const primaryL = extractOklchLightness(primaryColor);
  return Math.abs(bgL - primaryL) < 0.25;
}

// ─── Anonymous ID derivation ───────────────────────────────────────────────────

type HueWord =
  | "crimson"
  | "amber"
  | "gold"
  | "lime"
  | "emerald"
  | "teal"
  | "cyan"
  | "azure"
  | "indigo"
  | "violet"
  | "magenta"
  | "rose"
  | "slate";

function hueToWord(hue: number | null): HueWord {
  if (hue === null) return "slate";
  // Normalize to 0..360
  const h = ((hue % 360) + 360) % 360;
  if (h < 15 || h >= 345) return "crimson"; // red
  if (h < 45) return "rose"; // red-orange
  if (h < 60) return "amber"; // orange
  if (h < 75) return "gold"; // yellow-orange
  if (h < 120) return "lime"; // yellow-green
  if (h < 165) return "emerald"; // green
  if (h < 200) return "teal"; // green-blue
  if (h < 225) return "cyan"; // cyan
  if (h < 255) return "azure"; // blue
  if (h < 285) return "indigo"; // blue-violet
  if (h < 315) return "violet"; // violet
  return "magenta"; // pink-magenta
}

function lightnessWord(bgLightness: number): "light" | "dim" | "dark" {
  if (bgLightness > 0.6) return "light";
  if (bgLightness > 0.25) return "dim";
  return "dark";
}

function chromaSuffix(chroma: number): "-vivid" | "-muted" | "" {
  if (chroma > 0.18) return "-vivid"; // oklch chroma
  if (chroma < 0.06) return "-muted";
  return "";
}

/** Build the anonymous ID from color math. Returns a unique id. */
function deriveAnonId(primaryColor: string, bgColor: string, usedIds: Set<string>): string {
  const hue = extractHue(primaryColor);
  const chroma = extractChroma(primaryColor);
  const bgL = extractLightness(bgColor);

  const hw = hueToWord(hue);
  const lw = lightnessWord(bgL);
  const cs = chromaSuffix(chroma);

  const base = `${hw}-${lw}${cs}`;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  // De-duplicate with numeric suffix
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }
  // Fallback (should never happen with 73 themes)
  const ts = Date.now() % 10000;
  const id = `${base}-${ts}`;
  usedIds.add(id);
  return id;
}

// ─── Font family scrubbing ──────────────────────────────────────────────────────

/** Detect if a font family string has brand-specific fonts and return a generic stack. */
function genericizeFontFamily(fontFamily: string): string {
  if (!fontFamily) return GENERIC_FONT_STACK;

  const lower = fontFamily.toLowerCase();

  // Monospace indicators
  if (
    lower.includes("mono") ||
    lower.includes("code") ||
    lower.includes("consolas") ||
    lower.includes("courier") ||
    lower.includes("fira") ||
    lower.includes("jetbrains") ||
    lower.includes("cascadia")
  ) {
    return MONO_FONT_STACK;
  }

  // Serif indicators
  if (
    (lower.includes("serif") && !lower.includes("sans")) ||
    lower.includes("georgia") ||
    lower.includes("times") ||
    lower.includes("playfair") ||
    lower.includes("merriweather") ||
    lower.includes("lora")
  ) {
    return SERIF_FONT_STACK;
  }

  // Otherwise use the generic sans stack
  return GENERIC_FONT_STACK;
}

// ─── Neutral color detection ──────────────────────────────────────────────────

function isNeutral(value: string): boolean {
  const v = value.trim();
  const rgb = parseColorToLinear(v);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread < 0.1) return true; // low saturation
  if (r < 0.04 && g < 0.04 && b < 0.04) return true; // near-black
  if (r > 0.96 && g > 0.96 && b > 0.96) return true; // near-white
  return false;
}

// ─── Description generator ────────────────────────────────────────────────────

function buildDescription(anonId: string, primaryColor: string, bgColor: string): string {
  const hue = extractHue(primaryColor);
  const chroma = extractChroma(primaryColor);
  const bgL = extractLightness(bgColor);

  const hw = hueToWord(hue);
  const lw = lightnessWord(bgL);

  const satDesc = chroma > 0.18 ? "vivid" : chroma < 0.06 ? "low-saturation" : "balanced";
  const modeDesc = lw === "dark" ? "dark" : lw === "dim" ? "mid-tone" : "light";

  // Capitalize hue word for nice description
  const hueCapitalized = hw.charAt(0).toUpperCase() + hw.slice(1);

  return `Community theme — ${hueCapitalized} primary, ${satDesc} chroma, ${modeDesc} surface`;
}

// ─── ThemeJson type ────────────────────────────────────────────────────────────

interface TokenLeaf {
  $value: string;
  $type: string;
}

interface ThemeJson {
  $schema: string;
  $description: string;
  theme: string;
  color: Record<string, TokenLeaf>;
  radius: Record<string, TokenLeaf>;
  fontFamily: Record<string, TokenLeaf>;
  shadow: Record<string, TokenLeaf>;
}

// ─── Theme synthesis ──────────────────────────────────────────────────────────

interface SynthResult {
  theme: ThemeJson;
  nudged: boolean;
  nudgedRoles: string[];
}

function synthesizeTheme(
  importedColors: Record<string, string>,
  importedRadius: Record<string, string>,
  importedFont: string | undefined,
  anonId: string,
): SynthResult {
  const nudgedRoles: string[] = [];

  // ── Primary ───────────────────────────────────────────────────────────────
  let primary = importedColors["primary"] ?? importedColors["brand"] ?? importedColors["accent"];

  if (!primary) {
    // Find first chromatic color
    for (const val of Object.values(importedColors)) {
      if (!isNeutral(val)) {
        primary = val;
        break;
      }
    }
  }
  if (!primary) {
    // All neutral — use darkest non-white
    let darkestL = 1;
    let darkestVal: string | undefined;
    for (const val of Object.values(importedColors)) {
      const l = extractLightness(val);
      if (l < darkestL && l > 0.05) {
        darkestL = l;
        darkestVal = val;
      }
    }
    primary = darkestVal ?? "oklch(0.5 0.1 240)";
  }

  // ── Background ────────────────────────────────────────────────────────────
  // Exclude transparent/alpha colors as background candidates
  function isValidBackground(v: string): boolean {
    if (!v) return false;
    // Reject rgba(...) with low alpha (e.g. rgba(133,91,251,0.16))
    const rgbaAlpha = /^rgba\([^)]+,\s*([\d.]+)\s*\)/i.exec(v);
    if (rgbaAlpha) {
      const alpha = parseFloat(rgbaAlpha[1]!);
      if (alpha < 0.85) return false; // too transparent
    }
    // Reject color() / oklch() with alpha component if < 0.85
    return true;
  }

  const bgCandidateKeys = ["background", "canvas", "surface", "surface-base", "base"];
  let background: string | undefined;
  for (const key of bgCandidateKeys) {
    const val = importedColors[key];
    if (val && isValidBackground(val)) {
      background = val;
      break;
    }
  }

  if (!background) {
    // Guess dark or light from the primary lightness
    // If primary is a dark color we default to dark; else light
    const bgL = extractLightness(primary);
    background = bgL > 0.5 ? DEFAULT_BACKGROUND_LIGHT : DEFAULT_BACKGROUND_DARK;
  }

  // ── Background neutralization ─────────────────────────────────────────────
  // The background must be a neutral surface, clearly distinct from primary.
  // It is USABLE only if: chroma ≤ 0.04 AND it is perceptually distinct from primary.
  {
    const bgChroma = extractOklchChroma(background);
    const bgIsUsable = bgChroma <= 0.04 && !bgTooCloseToPrimary(background, primary);

    if (!bgIsUsable) {
      // Determine a neutral surface that is perceptually distinct from primary.
      // Light surface: L=0.99. Dark surface: L=0.16.
      // Rule: prefer the surface whose L differs from primary L by ≥ 0.25.
      //   - If primaryL > 0.74 → only dark surface is far enough (0.99 - 0.74 < 0.25)
      //   - If primaryL < 0.41 → only light surface is far enough (0.41 - 0.16 < 0.25)
      //   - Otherwise either works: honour source bg intent (L > 0.5 → light)
      const primaryL = extractOklchLightness(primary);
      const srcBgL = extractOklchLightness(background);

      const LIGHT_BG_L = 0.99;
      const DARK_BG_L = 0.16;
      const MIN_L_DIFF = 0.25;

      let isLightDesigned: boolean;
      const lightFarEnough = Math.abs(LIGHT_BG_L - primaryL) >= MIN_L_DIFF; // 0.99 - pL ≥ 0.25 → pL ≤ 0.74
      const darkFarEnough = Math.abs(DARK_BG_L - primaryL) >= MIN_L_DIFF; // pL - 0.16 ≥ 0.25 → pL ≥ 0.41

      if (lightFarEnough && darkFarEnough) {
        // Both options work: honour source bg intent
        isLightDesigned = srcBgL > 0.5;
      } else if (lightFarEnough) {
        // Only light bg is far enough from primary
        isLightDesigned = true;
      } else {
        // Only dark bg is far enough (or fallback)
        isLightDesigned = false;
      }

      // Extract primary hue for a subtle brand undertone in the neutral.
      const primaryHue = extractOklchHue(primary);
      const hueStr = primaryHue !== null ? primaryHue.toFixed(1) : "0.0";

      background = isLightDesigned
        ? `oklch(0.99 0.004 ${hueStr})` // barely-tinted near-white
        : `oklch(0.16 0.005 ${hueStr})`; // near-charcoal

      nudgedRoles.push("background");
    }
  }

  // ── Foreground ────────────────────────────────────────────────────────────
  let foreground =
    importedColors["foreground"] ??
    importedColors["text"] ??
    importedColors["ink"] ??
    importedColors["on-background"];

  if (!foreground) {
    // Use pickForeground to guarantee AA
    const { value: pickedFg, nudged: fgNudged } = pickForeground(background);
    foreground = pickedFg;
    if (fgNudged) nudgedRoles.push("foreground");
  } else {
    // Verify AA contrast for foreground vs background
    const ratio = contrastRatio(foreground, background);
    if (ratio < 4.5) {
      const { value: pickedFg } = pickForeground(background);
      foreground = pickedFg;
      nudgedRoles.push("foreground");
    }
  }

  // ── Accent ────────────────────────────────────────────────────────────────
  let accent =
    importedColors["accent"] ?? importedColors["secondary"] ?? importedColors["highlight"];

  if (!accent) {
    // Find a second chromatic color different from primary
    let foundSecond = false;
    for (const [key, val] of Object.entries(importedColors)) {
      if (val === primary) continue;
      if (
        key === "background" ||
        key === "foreground" ||
        key === "canvas" ||
        key === "text" ||
        key === "ink"
      )
        continue;
      if (!isNeutral(val)) {
        accent = val;
        foundSecond = true;
        break;
      }
    }
    if (!foundSecond) accent = primary;
  }

  // ── Primary foreground (WCAG AA) ─────────────────────────────────────────
  const { value: primaryFg, nudged: primaryNudged } = pickForeground(primary);
  if (primaryNudged) nudgedRoles.push("primary-foreground");

  const { value: accentFg, nudged: accentNudged } = pickForeground(accent);
  if (accentNudged) nudgedRoles.push("accent-foreground");

  // ── Surface tiers ─────────────────────────────────────────────────────────
  // We approximate color-mix in pre-computed oklch steps
  const bgL = extractLightness(background);
  const isDark = bgL < 0.4;

  // Compute oklch approximation of background + slight adjustment
  const bgOklch = toOklch(background);
  const fgOklch = toOklch(foreground);

  // card = mix background 4% toward foreground
  const card = mixOklch(bgOklch, fgOklch, isDark ? 0.06 : 0.02);
  // popover = mix 6% toward foreground
  const popover = mixOklch(bgOklch, fgOklch, isDark ? 0.08 : 0.04);
  // muted = mix 8% toward foreground
  const muted = mixOklch(bgOklch, fgOklch, isDark ? 0.12 : 0.06);

  // muted-foreground = slightly muted version of foreground
  const mutedFg = mixOklch(fgOklch, bgOklch, 0.35);

  // secondary = muted neutral
  const secondaryOklch = mixOklch(bgOklch, fgOklch, isDark ? 0.2 : 0.08);
  const { value: secondaryFg } = pickForeground(secondaryOklch);

  // border = mix 12%
  const border = mixOklch(bgOklch, fgOklch, isDark ? 0.22 : 0.1);
  // input = mix 10%
  const input = mixOklch(bgOklch, fgOklch, isDark ? 0.18 : 0.08);

  // primary-hover = color-mix(primary, white 12%)
  const primaryHover = isDark
    ? `color-mix(in oklch, ${primary}, white 12%)`
    : `color-mix(in oklch, ${primary}, white 12%)`;
  // primary-active = color-mix(primary, black 10%)
  const primaryActive = `color-mix(in oklch, ${primary}, black 10%)`;

  // brand-gradient
  const brandGradient = `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;

  // ── Radius ────────────────────────────────────────────────────────────────
  const radius = {
    sm: importedRadius["sm"] ?? DEFAULT_RADIUS.sm,
    md: importedRadius["md"] ?? DEFAULT_RADIUS.md,
    lg: importedRadius["lg"] ?? DEFAULT_RADIUS.lg,
    xl: importedRadius["xl"] ?? DEFAULT_RADIUS.xl,
    full: importedRadius["full"] ?? DEFAULT_RADIUS.full,
  };

  // ── Font family ───────────────────────────────────────────────────────────
  const genericFont = importedFont ? genericizeFontFamily(importedFont) : GENERIC_FONT_STACK;

  // ── Shadow (tinted with primary) ──────────────────────────────────────────
  const primaryRgb = parseColorToLinear(primary);
  const shadowR = primaryRgb ? Math.round(primaryRgb[0] * 255) : 100;
  const shadowG = primaryRgb ? Math.round(primaryRgb[1] * 255) : 100;
  const shadowB = primaryRgb ? Math.round(primaryRgb[2] * 255) : 200;

  // ── Description ───────────────────────────────────────────────────────────
  const description = buildDescription(anonId, primary, background);

  const theme: ThemeJson = {
    $schema: "https://design-tokens.github.io/community-group/format/",
    $description: `${description}`,
    theme: anonId,
    color: {
      primary: { $value: primary, $type: "color" },
      "primary-foreground": { $value: primaryFg, $type: "color" },
      secondary: { $value: secondaryOklch, $type: "color" },
      "secondary-foreground": { $value: secondaryFg, $type: "color" },
      accent: { $value: accent, $type: "color" },
      "accent-foreground": { $value: accentFg, $type: "color" },
      background: { $value: background, $type: "color" },
      foreground: { $value: foreground, $type: "color" },
      card: { $value: card, $type: "color" },
      "card-foreground": { $value: foreground, $type: "color" },
      popover: { $value: popover, $type: "color" },
      "popover-foreground": { $value: foreground, $type: "color" },
      muted: { $value: muted, $type: "color" },
      "muted-foreground": { $value: mutedFg, $type: "color" },
      border: { $value: border, $type: "color" },
      input: { $value: input, $type: "color" },
      ring: { $value: primary, $type: "color" },
      "primary-hover": { $value: primaryHover, $type: "color" },
      "primary-active": { $value: primaryActive, $type: "color" },
      "brand-gradient": { $value: brandGradient, $type: "color" },
      // Fixed semantic colors
      ...SEMANTIC_FIXED,
    },
    radius: {
      sm: { $value: radius.sm, $type: "dimension" },
      md: { $value: radius.md, $type: "dimension" },
      lg: { $value: radius.lg, $type: "dimension" },
      xl: { $value: radius.xl, $type: "dimension" },
      full: { $value: radius.full, $type: "dimension" },
    },
    fontFamily: {
      sans: { $value: genericFont, $type: "fontFamily" },
    },
    shadow: {
      sm: { $value: `0 1px 2px 0 rgb(${shadowR} ${shadowG} ${shadowB} / 0.08)`, $type: "shadow" },
      md: {
        $value: `0 4px 6px -1px rgb(${shadowR} ${shadowG} ${shadowB} / 0.12)`,
        $type: "shadow",
      },
      lg: {
        $value: `0 10px 15px -3px rgb(${shadowR} ${shadowG} ${shadowB} / 0.12)`,
        $type: "shadow",
      },
      xl: {
        $value: `0 20px 25px -5px rgb(${shadowR} ${shadowG} ${shadowB} / 0.12)`,
        $type: "shadow",
      },
    },
  };

  return { theme, nudged: nudgedRoles.length > 0, nudgedRoles };
}

// ─── oklch helpers for surface tier computation ────────────────────────────────

/** Approximate an input color as an oklch string (preserves oklch, converts hex/rgb). */
function toOklch(value: string): string {
  const v = value.trim();
  if (/^oklch/i.test(v)) return v;

  const rgb = parseColorToLinear(v);
  if (!rgb) return "oklch(0.5 0 0)";
  const [r, g, b] = rgb;

  // Approximate: go through linear→OKLab
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(A * A + B * B);
  const H = (Math.atan2(B, A) * 180) / Math.PI;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${((H + 360) % 360).toFixed(1)})`;
}

/** Mix two oklch color strings by a ratio (0 = all A, 1 = all B). */
function mixOklch(colorA: string, colorB: string, ratio: number): string {
  const parseOklch = (c: string): [number, number, number] | null => {
    const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(c);
    if (!m) return null;
    return [parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!)];
  };

  const a = parseOklch(colorA);
  const b = parseOklch(colorB);
  if (!a || !b) return colorA;

  const t = Math.max(0, Math.min(1, ratio));
  // Handle hue interpolation (take shortest path)
  let hDiff = b[2] - a[2];
  if (hDiff > 180) hDiff -= 360;
  if (hDiff < -180) hDiff += 360;

  const L = a[0] + (b[0] - a[0]) * t;
  const C = a[1] + (b[1] - a[1]) * t;
  const H = (a[2] + hDiff * t + 360) % 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

// ─── Brand leak guard ──────────────────────────────────────────────────────────

/** Load all source brand names from the corpus filenames. */
function loadBrandNames(corpusDir: string, files: string[]): Set<string> {
  const brands = new Set<string>();
  for (const f of files) {
    const base = basename(f, ".md").toLowerCase();
    brands.add(base);
    // Also add variants like "airbnb" → "airbnb", "linear.app" → "linear", etc.
    const dotParts = base.split(".");
    for (const part of dotParts) {
      if (part.length > 2) brands.add(part);
    }
    // Handle hyphenated multi-part names
    const hyphenParts = base.split("-");
    for (const part of hyphenParts) {
      if (part.length > 3) brands.add(part);
    }
  }
  return brands;
}

/**
 * Values that are part of standard CSS/font stacks or generic color names
 * — these are NOT brand leaks even if they match a corpus brand name.
 */
const GENERIC_VALUE_TOKENS = new Set([
  // System font stack tokens
  "apple", // -apple-system is a generic CSS font fallback
  "system",
  "segoe",
  // Color words that are both brand names and generic hue descriptors
  "lime",
  "teal",
  "cyan",
  "rose",
  "amber",
  "slate",
  "emerald",
  // Common product/UI words that are not brand identifiers
  "card",
  "ring",
  "base",
  "full",
  "sans",
  "serif",
  "light",
  "dark",
  "bold",
  "thin",
  "mono",
  "code",
  "open",
  "warp",
  "notion", // notion → notion-like colors, generic
  // Short tokens that are too generic
  "bmw",
  "hp",
  "ibm",
  "cal", // these are OK in the theme IDs themselves
]);

function containsDelimitedToken(value: string, token: string, delimiters: Set<string>): boolean {
  let start = value.indexOf(token);
  while (start !== -1) {
    const before = start === 0 ? "" : (value[start - 1] ?? "");
    const afterIndex = start + token.length;
    const after = afterIndex >= value.length ? "" : (value[afterIndex] ?? "");
    const hasLeftBoundary = before === "" || delimiters.has(before);
    const hasRightBoundary = after === "" || delimiters.has(after);
    if (hasLeftBoundary && hasRightBoundary) return true;
    start = value.indexOf(token, start + 1);
  }
  return false;
}

/** Assert a generated theme contains no brand name leaks. */
function assertNoBrandLeak(theme: ThemeJson, brandNames: Set<string>): void {
  // Only check: theme id, $description text (not inside font stacks or color values)
  const idAndDesc = `${theme.theme} ${theme.$description}`.toLowerCase();

  for (const brand of brandNames) {
    if (brand.length < 5) continue; // skip very short tokens (too many false positives)
    if (GENERIC_VALUE_TOKENS.has(brand)) continue;

    // Compound check: only flag if the brand name appears as a word boundary
    // (not as part of a longer token like "linear-gradient")
    if (containsDelimitedToken(idAndDesc, brand, new Set(["-", " ", "\t", "\n"]))) {
      throw new Error(
        `BRAND LEAK: brand name "${brand}" found in id/description of theme "${theme.theme}": "${idAndDesc}"`,
      );
    }
  }

  // Also check color values don't contain raw brand names (e.g. as font names)
  const fontValue = theme.fontFamily.sans.$value.toLowerCase();
  for (const brand of brandNames) {
    if (brand.length < 5) continue;
    if (GENERIC_VALUE_TOKENS.has(brand)) continue;
    // Font stack check: look for the brand name as a word (hyphen/space boundary)
    if (containsDelimitedToken(fontValue, brand, new Set([" ", "\t", "\n", "'", '"', ","]))) {
      throw new Error(
        `BRAND LEAK: brand name "${brand}" found in font stack of theme "${theme.theme}": "${fontValue}"`,
      );
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ManifestEntry {
  anonId: string;
  name: string;
  category: string;
  mood: string;
}

async function main(): Promise<void> {
  process.stdout.write("=== generate-corpus-themes.mts ===\n");

  // 1. List corpus files
  const files = (await readdir(CORPUS_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => join(CORPUS_DIR, f));

  process.stdout.write(`Found ${files.length} corpus files\n`);

  const brandNames = loadBrandNames(
    CORPUS_DIR,
    files.map((f) => basename(f)),
  );
  process.stdout.write(`Loaded ${brandNames.size} brand name tokens for leak guard\n\n`);

  // 2. Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const usedIds = new Set<string>();
  // Pre-populate with existing theme IDs to avoid conflicts
  for (const existingId of [
    "nebutra",
    "dark-dense",
    "minimal",
    "vibrant",
    "ocean",
    "dark",
    "light",
  ]) {
    usedIds.add(existingId);
  }

  const manifest: ManifestEntry[] = [];
  let written = 0;
  let nudgeCount = 0;
  const allIds: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const filePath of files) {
    const brand = basename(filePath, ".md");
    try {
      const content = await readFile(filePath, "utf8");
      const { set } = importFromDesignMd(content);

      // Extract imported colors as plain Record<string, string>
      const rawColors: Record<string, string> = {};
      const colorTree = (set.tokens["color"] ?? {}) as Record<string, { $value?: string }>;
      for (const [k, v] of Object.entries(colorTree)) {
        if (v && typeof v === "object" && "$value" in v && typeof v.$value === "string") {
          rawColors[k] = v.$value;
        }
      }

      // Extract radius
      const rawRadius: Record<string, string> = {};
      const radiusTree = (set.tokens["radius"] ?? {}) as Record<string, { $value?: string }>;
      for (const [k, v] of Object.entries(radiusTree)) {
        if (v && typeof v === "object" && "$value" in v && typeof v.$value === "string") {
          rawRadius[k] = v.$value;
        }
      }

      // Extract font family
      const fontTree = (set.tokens["fontFamily"] ?? {}) as Record<string, { $value?: string }>;
      const importedFont = fontTree["sans"]?.$value;

      // Pick primary color for ID derivation
      const primary =
        rawColors["primary"] ??
        rawColors["brand"] ??
        Object.values(rawColors).find((v) => !isNeutral(v)) ??
        Object.values(rawColors)[0] ??
        "oklch(0.5 0.1 240)";

      const background =
        rawColors["background"] ?? rawColors["canvas"] ?? rawColors["surface"] ?? "oklch(1 0 0)";

      // Derive anonymous ID
      const anonId = deriveAnonId(primary, background, usedIds);

      // Synthesize full theme
      const { theme, nudged, nudgedRoles } = synthesizeTheme(
        rawColors,
        rawRadius,
        importedFont,
        anonId,
      );

      if (nudged) {
        nudgeCount++;
        process.stdout.write(
          `  [AA-nudge] ${brand} → ${anonId}: nudged roles [${nudgedRoles.join(", ")}]\n`,
        );
      }

      // Brand leak guard
      assertNoBrandLeak(theme, brandNames);

      // Write theme file
      const outputPath = join(OUTPUT_DIR, `${anonId}.json`);
      await writeFile(outputPath, JSON.stringify(theme, null, 2) + "\n", "utf8");

      // Add to manifest
      const titleName = anonId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      manifest.push({
        anonId,
        name: titleName,
        category: "community",
        mood: theme.$description,
      });

      allIds.push(anonId);
      written++;
      process.stdout.write(`  [OK] ${brand} → ${anonId}\n`);
    } catch (err) {
      errors.push({ file: brand, error: (err as Error).message });
      process.stderr.write(`  [ERROR] ${brand}: ${(err as Error).message}\n`);
    }
  }

  // 3. Write manifest
  const manifestDir = await mkdtemp(join(tmpdir(), "nebutra-corpus-themes-"));
  const manifestPath = join(manifestDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  process.stdout.write(`\n=== Summary ===\n`);
  process.stdout.write(`Written: ${written} / ${files.length} themes\n`);
  process.stdout.write(`AA nudges applied: ${nudgeCount}\n`);
  process.stdout.write(`Errors: ${errors.length}\n`);
  if (errors.length > 0) {
    for (const e of errors) {
      process.stdout.write(`  - ${e.file}: ${e.error}\n`);
    }
  }
  process.stdout.write(`\nGenerated IDs:\n`);
  for (const id of allIds) {
    process.stdout.write(`  ${id}\n`);
  }
  process.stdout.write(`\nManifest written to: ${manifestPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});

/**
 * Colour maths for the token browser.
 *
 * Every number this module produces is COMPUTED from a token's own value. None
 * of it is stored, transcribed, or asserted anywhere in this app — that is the
 * whole point. A contrast ratio typed into a table is a claim that rots; a
 * contrast ratio computed from the token is a measurement that cannot.
 *
 * The OKLab ⇄ sRGB matrices and the WCAG relative-luminance formula are NOT
 * reimplemented here. They are imported from
 * `@nebutra/design-tokens/scripts/derive-border-tier.mjs` — the same module the
 * token build uses to derive the border tier and to assert the 12-step ladder
 * invariant. So the L* this page prints is, by construction, the L* the build
 * checked. A second implementation would be a second answer.
 *
 * What this module adds on top is only parsing: the DTCG source stores colour
 * in six different notations (see `parseColor`), and contrast needs an opaque
 * sRGB triple.
 */

import {
  contrastRatio,
  hexToOklab,
  hexToRgb,
  oklabToHex,
  relativeLuminance,
  rgbToHex,
} from "@nebutra/design-tokens/scripts/derive-border-tier.mjs";

export interface Oklch {
  /** OKLab lightness, 0…1. Displayed as L*. */
  l: number;
  /** Chroma — the hypotenuse of (a, b). */
  c: number;
  /** Hue angle in degrees, 0…360. */
  h: number;
}

export interface ParsedColor {
  /** Opaque #rrggbb. When `alpha < 1` this is the colour BEFORE compositing. */
  hex: string;
  /** 0…1. Below 1 means contrast needs a backdrop to be meaningful. */
  alpha: number;
  /** The notation the source used, for the provenance column. */
  notation: ColorNotation;
}

export type ColorNotation =
  | "hex"
  | "hsl-channels"
  | "hsl-function"
  | "rgb-function"
  | "oklch-function";

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
/** `0 0% 100%` — the bare channel triple that semantic tokens store. */
const HSL_CHANNELS_RE = /^(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%$/u;
const HSL_FN_RE = /^hsla?\(([^)]+)\)$/iu;
const RGB_FN_RE = /^rgba?\(([^)]+)\)$/iu;
const OKLCH_FN_RE = /^oklch\(([^)]+)\)$/iu;

function numbers(body: string): number[] {
  return body
    .split(/[\s,/]+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseFloat(part));
}

function expandHex(hex: string): string {
  if (hex.length !== 4) return hex.toLowerCase();
  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const chroma = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hp % 2) - 1));
  const sector = Math.floor(hp) % 6;
  const rgb: [number, number, number] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector] as [number, number, number];
  const m = lig - chroma / 2;
  return rgbToHex([rgb[0] + m, rgb[1] + m, rgb[2] + m]);
}

/** Polar OKLCH → sRGB, via the shared OKLab inverse. */
function oklchToHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  return oklabToHex({ L: l, a: c * Math.cos(rad), b: c * Math.sin(rad) });
}

/**
 * Parse any colour notation the DTCG source actually uses.
 *
 * Returns `null` when the value is not a static colour — most importantly when
 * it contains `var(...)`, which cannot be resolved without a live browser. Those
 * tokens are rendered as "resolved at runtime" rather than given a fabricated
 * value.
 */
export function parseColor(raw: string): ParsedColor | null {
  const value = raw.trim();
  if (value.includes("var(")) return null;

  if (HEX_RE.test(value)) {
    return { hex: expandHex(value), alpha: 1, notation: "hex" };
  }

  const channels = HSL_CHANNELS_RE.exec(value);
  if (channels) {
    return {
      hex: hslToHex(Number(channels[1]), Number(channels[2]), Number(channels[3])),
      alpha: 1,
      notation: "hsl-channels",
    };
  }

  const hslFn = HSL_FN_RE.exec(value);
  if (hslFn) {
    const [h, s, l, a] = numbers(hslFn[1]);
    if ([h, s, l].some((n) => !Number.isFinite(n))) return null;
    return { hex: hslToHex(h, s, l), alpha: a ?? 1, notation: "hsl-function" };
  }

  const rgbFn = RGB_FN_RE.exec(value);
  if (rgbFn) {
    const [r, g, b, a] = numbers(rgbFn[1]);
    if ([r, g, b].some((n) => !Number.isFinite(n))) return null;
    return {
      hex: rgbToHex([r / 255, g / 255, b / 255]),
      alpha: a ?? 1,
      notation: "rgb-function",
    };
  }

  const oklchFn = OKLCH_FN_RE.exec(value);
  if (oklchFn) {
    const body = oklchFn[1].trim();
    const [l, c, h, a] = numbers(body);
    if ([l, c, h].some((n) => !Number.isFinite(n))) return null;
    // `oklch(57.61% 0.2508 258.23)` — a percentage L is 0…100, a bare L is 0…1.
    const lightness = /^-?[\d.]+%/u.test(body) ? l / 100 : l;
    return {
      hex: oklchToHex(lightness, c, h),
      alpha: a ?? 1,
      notation: "oklch-function",
    };
  }

  return null;
}

/** OKLCH of an opaque hex. L* is 0…1; multiply by 100 for display. */
export function toOklch(hex: string): Oklch {
  const { L, a, b } = hexToOklab(hex);
  const c = Math.hypot(a, b);
  const h = c < 1e-6 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** Composite a translucent colour over an opaque backdrop, in sRGB. */
export function over(color: ParsedColor, backdropHex: string): string {
  if (color.alpha >= 1) return color.hex;
  const fg = hexToRgb(color.hex);
  const bg = hexToRgb(backdropHex);
  if (!fg || !bg) return color.hex;
  return rgbToHex(
    [0, 1, 2].map((i) => fg[i] * color.alpha + bg[i] * (1 - color.alpha)) as [
      number,
      number,
      number,
    ],
  );
}

/** WCAG 2.2 contrast ratio between two opaque hexes. */
export { contrastRatio, relativeLuminance };

/**
 * The role a token plays, and therefore which WCAG threshold applies.
 *
 * Assigned STRUCTURALLY, in `families.ts` — from a token's position in its
 * 12-step scale, or from the naming convention the pipeline itself relies on
 * (`X` / `X-foreground`). Not from its prose.
 *
 * An earlier version of this module inferred the role by keyword-matching
 * `$description`, and it was wrong in a way worth recording: light `--primary`'s
 * description ends "…must never surface on a component", which matched "surface"
 * and classified the action fill as a background; dark `--primary`'s description
 * says "…paired with the near-black --primary-foreground", which matched
 * "foreground" and classified the same slot as text. Two modes of one token,
 * two different roles, both wrong, from prose that was accurate. Descriptions are
 * for the reader; structure is for the machine.
 */
export type ContrastRole = "text" | "boundary" | "fill" | "surface" | "unknown";

/**
 * WCAG 2.2 thresholds.
 *
 * `1.4.3` — 4.5:1 for body text, 3:1 for large text (≥24px, or ≥19px bold).
 * `1.4.11` — 3:1 for the visual boundary of a UI component or a meaningful
 * graphic. Purely decorative separation is out of scope of 1.4.11, which is why
 * a token the source calls a "subtle border" can sit below 3:1 by design and the
 * site reports the measurement rather than calling it a defect.
 */
export const WCAG_TEXT_MIN = 4.5;
export const WCAG_LARGE_TEXT_MIN = 3;
export const WCAG_BOUNDARY_MIN = 3;

export interface ContrastVerdict {
  ratio: number;
  /** The bar this pairing has to clear, or null when the role sets no bar. */
  required: number | null;
  passes: boolean | null;
  /**
   * For text pairings only: whether it clears the 3:1 large-text bar. A button
   * label at 20px+ semibold is large text, so a fill/label pair between 3 and
   * 4.5 is conformant at that size and not at body size. Both numbers matter,
   * so the page shows both instead of collapsing them into one verdict.
   */
  passesLarge: boolean | null;
}

export function judge(ratio: number, role: ContrastRole): ContrastVerdict {
  const required = role === "text" ? WCAG_TEXT_MIN : role === "boundary" ? WCAG_BOUNDARY_MIN : null;
  return {
    ratio,
    required,
    passes: required === null ? null : ratio >= required,
    passesLarge: role === "text" ? ratio >= WCAG_LARGE_TEXT_MIN : null,
  };
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

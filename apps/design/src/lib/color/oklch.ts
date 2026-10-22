/**
 * Hex ⇄ OKLCH for the palette generator.
 *
 * The OKLab matrices are not rewritten here. They live in
 * `@nebutra/design-tokens/scripts/derive-border-tier.mjs` — the module the token
 * build uses to derive the border tier — so the L* this generator targets is the
 * L* the build asserts on. What this file adds is the part that module leaves
 * out: the polar form (chroma, hue) and a gamut map. `oklabToHex` there clamps
 * channels, which turns an over-saturated request into a different hue; a
 * palette tool has to reduce chroma instead.
 */

import { hexToOklab, oklabToHex } from "@nebutra/design-tokens/scripts/derive-border-tier.mjs";

export interface Oklch {
  /** OKLab lightness, 0…1. */
  l: number;
  /** Chroma. Roughly 0…0.37 inside sRGB. */
  c: number;
  /** Hue angle in degrees, 0…360. */
  h: number;
}

/** `#rgb` / `#rrggbb`, hash optional, any case → lowercase `#rrggbb`, or null. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/u, "");
  if (/^[0-9a-f]{3}$/iu.test(raw)) {
    const [r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/iu.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

export function hexToOklch(hex: string): Oklch {
  const { L, a, b } = hexToOklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l: L, c: Math.hypot(a, b), h: (h + 360) % 360 };
}

function toOklab({ l, c, h }: Oklch): { L: number; a: number; b: number } {
  const radians = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

/**
 * How far a colour may sit outside sRGB before it counts as out. 8-bit
 * quantisation alone moves a colour by up to ~0.002 in OKLab, so the tolerance
 * has to sit above that or every in-gamut colour would read as clipped.
 */
const GAMUT_TOLERANCE = 0.004;

/**
 * Whether sRGB can show the colour. Tested by round trip — clamp to a hex, read
 * it back, compare — which avoids restating the inverse matrices here.
 */
export function inSrgbGamut(color: Oklch): boolean {
  const target = toOklab(color);
  const back = hexToOklab(oklabToHex(target));
  return Math.hypot(back.L - target.L, back.a - target.a, back.b - target.b) < GAMUT_TOLERANCE;
}

/**
 * OKLCH → `#rrggbb`. Out-of-gamut requests keep their lightness and hue and
 * lose chroma (binary search for the largest chroma sRGB can hold), the same
 * strategy CSS Color 4 gamut mapping starts from.
 */
export function oklchToHex(color: Oklch): string {
  const l = Math.min(1, Math.max(0, color.l));
  // Pure white and pure black have no chroma to give; asking for any lands on
  // a tinted near-white that the gamut tolerance would otherwise wave through.
  const wanted = { l, c: l === 0 || l === 1 ? 0 : Math.max(0, color.c), h: color.h };
  if (inSrgbGamut(wanted)) return oklabToHex(toOklab(wanted));

  let low = 0;
  let high = wanted.c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (inSrgbGamut({ ...wanted, c: mid })) low = mid;
    else high = mid;
  }
  return oklabToHex(toOklab({ ...wanted, c: low }));
}

const trim = (value: number, digits: number) =>
  String(Number.parseFloat((Number.isFinite(value) ? value : 0).toFixed(digits)));

/** CSS `oklch()` with enough precision to round-trip an 8-bit hex. */
export function formatOklch({ l, c, h }: Oklch): string {
  return `oklch(${trim(l, 4)} ${trim(c, 4)} ${trim(h, 2)})`;
}

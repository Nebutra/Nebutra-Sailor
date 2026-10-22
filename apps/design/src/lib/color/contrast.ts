/**
 * Contrast, both ways.
 *
 * WCAG 2 is the number a compliance review asks for; APCA is the number that
 * tracks perceived legibility (polarity-aware, so dark-on-light and light-on-dark
 * of the same pair differ). The page shows both because they disagree in
 * exactly the places a designer cares about — saturated mid-tones.
 *
 * WCAG reuses the token build's implementation. APCA is APCA-W3 0.0.98G-4g.
 */

import { contrastRatio, hexToRgb } from "@nebutra/design-tokens/scripts/derive-border-tier.mjs";

/** WCAG 2.x contrast ratio between two `#rrggbb` colours, 1…21. */
export function wcagContrast(a: string, b: string): number {
  return contrastRatio(a, b);
}

// APCA-W3 0.0.98G-4g constants.
const MAIN_TRC = 2.4;
const COEF_R = 0.2126729;
const COEF_G = 0.7151522;
const COEF_B = 0.072175;
const BLACK_THRESHOLD = 0.022;
// biome-ignore lint/suspicious/noApproximativeNumericConstant: APCA specifies 1.414 exactly, not √2.
const BLACK_CLAMP = 1.414;
const DELTA_Y_MIN = 0.0005;
const NORM_BG = 0.56;
const NORM_TEXT = 0.57;
const REV_TEXT = 0.62;
const REV_BG = 0.65;
const SCALE = 1.14;
const OFFSET = 0.027;
const LOW_CLIP = 0.1;

function apcaLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`apca: not a #rrggbb hex: ${hex}`);
  const [r, g, b] = rgb as [number, number, number];
  const y = COEF_R * r ** MAIN_TRC + COEF_G * g ** MAIN_TRC + COEF_B * b ** MAIN_TRC;
  return y >= BLACK_THRESHOLD ? y : y + (BLACK_THRESHOLD - y) ** BLACK_CLAMP;
}

/**
 * APCA lightness contrast (Lc) of `text` on `background`. Positive for dark text
 * on a light ground, negative for light on dark; magnitude runs to about 108.
 * Zero below the noise floor.
 */
export function apcaLc(text: string, background: string): number {
  const yText = apcaLuminance(text);
  const yBg = apcaLuminance(background);
  if (Math.abs(yBg - yText) < DELTA_Y_MIN) return 0;

  if (yBg > yText) {
    const sapc = (yBg ** NORM_BG - yText ** NORM_TEXT) * SCALE;
    return sapc < LOW_CLIP ? 0 : (sapc - OFFSET) * 100;
  }
  const sapc = (yBg ** REV_BG - yText ** REV_TEXT) * SCALE;
  return sapc > -LOW_CLIP ? 0 : (sapc + OFFSET) * 100;
}

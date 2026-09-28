/**
 * The plate a third-party logo should sit on, computed from its pixels.
 *
 * A fixed white mat makes white marks vanish; a fixed dark one does the same to
 * black marks. The plate is decided by the image instead:
 *
 * - An even, opaque border means the logo brings its own background: the plate
 *   is that colour, so mark and plate read as one tile (`own: true`).
 * - Otherwise two quiet plates compete — a near-white and a near-black, tinted
 *   towards the mark's own hue (the House neutrals' hue for a black or white
 *   mark) — scored by contrast over every inked pixel, so a two-tone mark is
 *   judged by what it draws, not by an average colour.
 *
 * Pure: takes RGBA pixels (e.g. a canvas getImageData of the logo drawn at
 * `side`×`side`), returns a CSS colour. useLogoPlate runs it in the browser.
 */

export interface LogoPlate {
  /** CSS colour for the plate behind the logo. */
  plate: string;
  /** The plate is the logo's own background colour. */
  own: boolean;
}

type Rgba = readonly [number, number, number, number];

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (p: readonly number[]) =>
  0.2126 * toLinear(p[0] ?? 0) + 0.7152 * toLinear(p[1] ?? 0) + 0.0722 * toLinear(p[2] ?? 0);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hex = (rgb: readonly number[]) =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

function hsl(h: number, s: number, l: number): number[] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function hueSat(p: Rgba): { h: number; s: number } {
  const [r, g, b] = [p[0] / 255, p[1] / 255, p[2] / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { h: 0, s: 0 };
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: d / (1 - Math.abs(max + min - 1)) };
}

/** Hue of the House neutrals (OKLCH 264 ≈ hsl 225), for marks with no colour. */
const NEUTRAL_HUE = 225;

export function logoPlateFromPixels(rgba: ArrayLike<number>, side: number): LogoPlate | null {
  const px = (x: number, y: number): Rgba => {
    const i = (y * side + x) * 4;
    return [rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0, rgba[i + 3] ?? 0];
  };

  // Its own background: an opaque border of one colour.
  const border: Rgba[] = [];
  for (let i = 0; i < side; i++) border.push(px(i, 0), px(i, side - 1), px(0, i), px(side - 1, i));
  const opaque = border.filter((p) => p[3] > 200);
  if (opaque.length / border.length >= 0.9) {
    const mean = [0, 1, 2].map((c) => opaque.reduce((s, p) => s + (p[c] ?? 0), 0) / opaque.length);
    const L = luminance(mean);
    if (Math.max(...opaque.map((p) => Math.abs(luminance(p) - L))) < 0.08) {
      return { plate: hex(mean), own: true };
    }
  }

  // On transparency: score two tinted plates over every inked pixel.
  let hx = 0;
  let hy = 0;
  let sat = 0;
  const ink: Rgba[] = [];
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const p = px(x, y);
      if (p[3] < 128) continue;
      ink.push(p);
      const { h, s } = hueSat(p);
      hx += Math.cos((h * Math.PI) / 180) * s;
      hy += Math.sin((h * Math.PI) / 180) * s;
      sat += s;
    }
  if (ink.length === 0) return null;

  const colourful = sat / ink.length > 0.15;
  const hue = colourful ? ((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360 : NEUTRAL_HUE;
  const tint = colourful ? 0.12 : 0.06;
  const light = hsl(hue, tint, 0.96);
  const dark = hsl(hue, tint, 0.13);
  const score = (plate: number[]) => {
    const L = luminance(plate);
    return ink.reduce((s, p) => s + Math.min(contrast(luminance(p), L), 7), 0) / ink.length;
  };
  return { plate: hex(score(light) >= score(dark) ? light : dark), own: false };
}

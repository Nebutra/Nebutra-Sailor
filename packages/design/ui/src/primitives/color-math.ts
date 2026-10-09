/**
 * Colour math for ColorPicker. sRGB is the storage space, HSV drives the 2D
 * area (a rectangle that maps 1:1 onto the sRGB gamut, so the thumb is never
 * clipped), OKLCH is the perceptual readout (Ottosson's OKLab matrices).
 * Pure functions, no DOM; no dependency.
 */

export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };
export type Hsva = { h: number; s: number; v: number; a: number };
export type Oklch = { l: number; c: number; h: number };

export type ColorFormat = "hex" | "rgb" | "oklch";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** Hue in [0, 360). */
export const wrapHue = (h: number) => ((h % 360) + 360) % 360;

export function rgbToHsv({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: wrapHue(h), s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb({ h, s, v }: { h: number; s: number; v: number }): Rgb {
  const hh = wrapHue(h) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    hh < 1
      ? [c, x, 0]
      : hh < 2
        ? [x, c, 0]
        : hh < 3
          ? [0, c, x]
          : hh < 4
            ? [0, x, c]
            : hh < 5
              ? [x, 0, c]
              : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

const toLinear = (c: number) => {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (n: number) => {
  const c = n <= 0.0031308 ? n * 12.92 : 1.055 * n ** (1 / 2.4) - 0.055;
  return c * 255;
};

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  // Hue is meaningless for greys; 0 keeps the output stable.
  const h = c < 1e-4 ? 0 : wrapHue((Math.atan2(B, A) * 180) / Math.PI);
  return { l: L, c, h };
}

/** Out-of-gamut results are clamped per channel (the picker only emits sRGB). */
export function oklchToRgb({ l: L, c, h }: Oklch): Rgb {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return {
    r: clamp(fromLinear(clamp(lr, 0, 1)), 0, 255),
    g: clamp(fromLinear(clamp(lg, 0, 1)), 0, 255),
    b: clamp(fromLinear(clamp(lb, 0, 1)), 0, 255),
  };
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

/** `#rrggbb`, or `#rrggbbaa` when `alpha` is true and a < 1. Always lowercase. */
export function rgbaToHex({ r, g, b, a }: Rgba, alpha = false): string {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return alpha && a < 1 ? `${base}${hex2(a * 255)}` : base;
}

const HEX_RE = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHex(input: string): boolean {
  return HEX_RE.test(input.trim());
}

export function parseHex(input: string): Rgba | null {
  const m = HEX_RE.exec(input.trim());
  if (!m?.[1]) return null;
  let h = m[1];
  if (h.length === 3 || h.length === 4) {
    h = [...h].map((ch) => ch + ch).join("");
  }
  const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round(n(6) / 255, 3) : 1 };
}

const NUM = "(-?\\d*\\.?\\d+)";
const RGB_RE = new RegExp(
  `^(?:rgba?\\()?\\s*${NUM}\\s*[,\\s]\\s*${NUM}\\s*[,\\s]\\s*${NUM}\\s*(?:[,/]\\s*${NUM}(%?))?\\s*\\)?$`,
  "i",
);
const OKLCH_RE = new RegExp(
  `^(?:oklch\\()?\\s*${NUM}(%?)\\s*[,\\s]\\s*${NUM}\\s*[,\\s]\\s*${NUM}(?:deg)?\\s*(?:/\\s*${NUM}(%?))?\\s*\\)?$`,
  "i",
);

export function parseRgbString(input: string): Rgba | null {
  const m = RGB_RE.exec(input.trim());
  if (!m) return null;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if ([r, g, b].some((n) => n < 0 || n > 255)) return null;
  const a = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4]);
  if (a < 0 || a > 1) return null;
  return { r, g, b, a };
}

export function parseOklchString(input: string): Rgba | null {
  const m = OKLCH_RE.exec(input.trim());
  if (!m) return null;
  const lRaw = Number(m[1]);
  const l = m[2] ? lRaw / 100 : lRaw;
  const c = Number(m[3]);
  const h = Number(m[4]);
  if (l < 0 || l > 1 || c < 0 || c > 0.5) return null;
  const a = m[5] === undefined ? 1 : m[6] ? Number(m[5]) / 100 : Number(m[5]);
  if (a < 0 || a > 1) return null;
  return { ...oklchToRgb({ l, c, h }), a };
}

/** Parse whatever the user typed: hex, rgb(), or oklch(). Null when it is none of them. */
export function parseColor(input: string, format?: ColorFormat): Rgba | null {
  const text = input.trim();
  if (!text) return null;
  if (format === "hex") return parseHex(text);
  if (format === "rgb") return parseRgbString(text);
  if (format === "oklch") return parseOklchString(text);
  if (/^oklch\(/i.test(text)) return parseOklchString(text);
  if (/^rgba?\(/i.test(text)) return parseRgbString(text);
  return parseHex(text);
}

export function formatRgb({ r, g, b, a }: Rgba, alpha = false): string {
  const base = `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
  return alpha && a < 1 ? `rgb(${base} / ${round(a, 2)})` : `rgb(${base})`;
}

export function formatOklch(rgb: Rgb, a = 1, alpha = false): string {
  const { l, c, h } = rgbToOklch(rgb);
  const base = `${round(l * 100, 1)}% ${round(c, 3)} ${round(h, 1)}`;
  return alpha && a < 1 ? `oklch(${base} / ${round(a, 2)})` : `oklch(${base})`;
}

export function formatColor(rgba: Rgba, format: ColorFormat, alpha = false): string {
  if (format === "rgb") return formatRgb(rgba, alpha);
  if (format === "oklch") return formatOklch(rgba, rgba.a, alpha);
  return rgbaToHex(rgba, alpha);
}

export const hsvaToRgba = (c: Hsva): Rgba => ({ ...hsvToRgb(c), a: c.a });

export function hexToHsva(hex: string): Hsva | null {
  const rgba = parseHex(hex);
  return rgba ? { ...rgbToHsv(rgba), a: rgba.a } : null;
}

/** Relative luminance based pick of a legible ink for a swatch (WCAG). */
export function readableInk(rgb: Rgb): "dark" | "light" {
  const lum = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  return lum > 0.36 ? "dark" : "light";
}

export { clamp as clampNumber, round as roundNumber };

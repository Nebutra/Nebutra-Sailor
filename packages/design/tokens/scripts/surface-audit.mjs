/**
 * Surface audit — measures what a stylesheet actually paints, so the contract
 * "borders are hairlines" is a number a test can hold, not a taste.
 *
 * Reads CSS text only (no browser, no Tailwind). It understands the three colour
 * spellings the token sheets use: HSL channel triples ("225 8% 90.2%"),
 * `hsl(...)`, and `color-mix(in oklab, A p%, B)` — enough to resolve every
 * `--border`, `--border-strong`, `--background` and `--card` a skin declares.
 *
 * Shared by `@nebutra/tokens` (src/__tests__/surface-contract.test.ts) and
 * `@nebutra/theme` (the published catalog). One implementation, two consumers.
 */
import {
  hexToOklab,
  oklabToHex,
  rgbToHex,
} from "@nebutra/design-tokens/scripts/derive-border-tier.mjs";

/**
 * Static stroke contrast (border against the surface it sits on). A hairline
 * reads as a boundary without becoming a drawn line: ~1.2:1 (Vercel, Linear) to
 * ~1.5:1 (dark skins, where the same alpha needs a little more lift). Above the
 * ceiling the page starts to look like a wireframe; below the floor the edge
 * disappears on a calibrated display.
 */
export const HAIRLINE_CONTRAST = { min: 1.1, max: 1.55 };

/** Motion ceilings (ms) for UI rails; cinematic is hero-only and unbounded here. */
export const MOTION_CEILING = { micro: 150, flow: 300, reveal: 400 };

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** HSL (degrees, percent, percent) → [r, g, b] 0…255. */
export function hslToRgb(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
}

export function luminance(rgb) {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

/** WCAG 2.x contrast ratio between two [r, g, b] colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const CHANNELS = /^\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/;
const HSL_FN = /^\s*hsl\(\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)\s*$/;
const MIX = /^\s*color-mix\(\s*in\s+oklab\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+)\s*\)\s*$/;

/** Parse a colour to [r, g, b]; returns null when the spelling is not understood. */
export function parseColor(value) {
  if (value == null) return null;
  const direct = CHANNELS.exec(value) ?? HSL_FN.exec(value);
  if (direct) return hslToRgb(Number(direct[1]), Number(direct[2]), Number(direct[3]));
  const hex = /^\s*#([0-9a-f]{6})\s*$/i.exec(value);
  if (hex) return [0, 2, 4].map((i) => Number.parseInt(hex[1].slice(i, i + 2), 16));
  const mix = MIX.exec(value);
  if (mix) {
    const from = parseColor(mix[1]);
    const into = parseColor(mix[3]);
    if (!from || !into) return null;
    const t = Number(mix[2]) / 100;
    // rgbToHex takes 0…1 channels; ours are 0…255.
    const a = hexToOklab(rgbToHex(from.map((c) => c / 255)));
    const b = hexToOklab(rgbToHex(into.map((c) => c / 255)));
    const out = oklabToHex({
      L: a.L * t + b.L * (1 - t),
      a: a.a * t + b.a * (1 - t),
      b: a.b * t + b.b * (1 - t),
    });
    return [1, 3, 5].map((i) => Number.parseInt(out.slice(i, i + 2), 16));
  }
  return null;
}

/** Flat `selector { body }` rules. The token sheets nest nothing in the blocks we read. */
export function cssBlocks(css) {
  const blocks = [];
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    blocks.push({ selector: match[1].trim().replace(/\s+/g, " "), body: match[2] });
  }
  return blocks;
}

/** The value a rule body declares for a custom property, or null. */
export function declared(body, name) {
  const match = new RegExp(`(?:^|[;\\s])${name}\\s*:\\s*([^;]+);`).exec(body);
  return match ? match[1].trim() : null;
}

/**
 * One palette per rule that declares both `--border` and `--background`
 * (a skin's light block, its `.dark` block, the factory `:root` / `.dark`).
 */
export function palettes(css) {
  const out = [];
  for (const { selector, body } of cssBlocks(css)) {
    const border = declared(body, "--border");
    const background = declared(body, "--background");
    if (border == null || background == null) continue;
    const bg = parseColor(background);
    const card = parseColor(declared(body, "--card"));
    const line = parseColor(border);
    if (!bg || !line) continue;
    const strongValue = declared(body, "--border-strong");
    const strong = strongValue ? parseColor(strongValue) : null;
    const mode = /\.dark/.test(selector) ? "dark" : "light";
    out.push({
      selector,
      mode,
      border,
      strongValue,
      borderVsBackground: contrast(line, bg),
      borderVsCard: card ? contrast(line, card) : null,
      strongVsBackground: strong ? contrast(strong, bg) : null,
    });
  }
  return out;
}

/** "6px" / "0.375rem" → 6; anything else (min(), var()) → null. */
export function toPx(value) {
  const match = /^\s*(-?[\d.]+)(px|rem)\s*$/.exec(value ?? "");
  if (!match) return null;
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}

/**
 * `--accent` is the shadcn hover surface: the tint a ghost button, a menu row,
 * an icon tile or a sidebar item takes under the pointer, with
 * `--accent-foreground` on it. It is not a brand hue.
 *
 * Five languages were emitting a brand hue there — Stripe midnight, Vanta
 * indigo, Notion black, Raycast coral, Cosmos ink (and Cosmos dark paper) —
 * because `semanticFromRoles` mapped `roles.brand` onto it. Every hover in the
 * product then filled with a solid dark block, and any child that set its own
 * colour (`text-foreground`, `text-muted-foreground`) vanished into it: the
 * icon gallery on the design site went dark on hover under Stripe.
 *
 * So the emitter does not trust the slot. An accent that sits more than a
 * hover's distance from the canvas, or whose foreground is unreadable on it,
 * is replaced with a tint of the canvas toward its own ink — the same
 * construction Vercel and Linear use for their hover rows — and its foreground
 * becomes the canvas foreground. A language whose accent already is a quiet
 * surface (Linear, Vercel, GSAP, Nebutra) passes through untouched.
 */

const HSL_RE = /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;

type Rgb = [number, number, number];

function hslToRgb(triple: string): Rgb | null {
  const m = triple.trim().match(HSL_RE);
  if (!m) return null;
  const h = (((Number(m[1]) % 360) + 360) % 360) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

function rgbToHsl([r, g, b]: Rgb): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return `${Math.round(h * 360)} ${round1(s * 100)}% ${round1(l * 100)}%`;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number | null {
  const ra = hslToRgb(a);
  const rb = hslToRgb(b);
  if (!ra || !rb) return null;
  const la = luminance(ra);
  const lb = luminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Furthest an accent may sit from the canvas and still read as a hover tint. */
export const MAX_HOVER_SURFACE_CONTRAST = 2;
/** Body-text contrast for the label on the hover surface. */
export const MIN_HOVER_LABEL_CONTRAST = 4.5;

export interface HoverSurface {
  accent: string;
  accentForeground: string;
}

/**
 * The accent pair to emit. Returns the declared pair when it is a legible,
 * quiet surface; otherwise a tint of `background` toward `foreground` (6% on a
 * light canvas, 10% on a dark one, where the same step reads smaller).
 */
export function hoverSurface(
  accent: string,
  accentForeground: string,
  background: string,
  foreground: string,
): HoverSurface {
  const distance = contrastRatio(accent, background);
  const label = contrastRatio(accentForeground, accent);
  if (distance === null || label === null) return { accent, accentForeground };
  if (distance <= MAX_HOVER_SURFACE_CONTRAST && label >= MIN_HOVER_LABEL_CONTRAST) {
    return { accent, accentForeground };
  }
  const bg = hslToRgb(background);
  const fg = hslToRgb(foreground);
  if (!bg || !fg) return { accent, accentForeground };
  const k = luminance(bg) > 0.5 ? 0.06 : 0.1;
  const mixed: Rgb = [
    bg[0] + (fg[0] - bg[0]) * k,
    bg[1] + (fg[1] - bg[1]) * k,
    bg[2] + (fg[2] - bg[2]) * k,
  ];
  return { accent: rgbToHsl(mixed), accentForeground: foreground };
}

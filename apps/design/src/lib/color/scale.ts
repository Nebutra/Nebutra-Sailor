/**
 * The 12-step ladder, generated from one seed colour.
 *
 * The steps mean what `--blue-1…12` mean in the token source (the Radix tiering
 * the colour page documents): 1–2 backgrounds, 3–5 component backgrounds at
 * rest / hover / active, 6–8 borders, 9–10 solid fills, 11–12 text. The shape
 * of the ladder — where lightness and chroma sit at each step — is read off our
 * hand-tuned blue, and `scale.test.ts` pins the generator to it. The generator
 * is a function of three numbers (the seed's L, C, h); it does not look anything
 * up.
 *
 * Two promises, both tested:
 *   - the seed IS step 9 in light mode (a brand colour is not re-interpreted),
 *   - the text steps clear WCAG AA / AAA on the subtle background for any seed,
 *     because the generator darkens (or lightens) them until they do.
 * Everything else is reported, not forced: `evaluatePairs` says which pairings
 * miss, rather than bending the ladder until nothing does.
 */

import { apcaLc, wcagContrast } from "./contrast";
import { hexToOklch, normalizeHex, type Oklch, oklchToHex } from "./oklch";

export type Mode = "light" | "dark";

export interface StepRole {
  step: number;
  id: string;
  label: string;
  /** What a consumer reaches for this step to do. */
  use: string;
}

export const STEP_ROLES: readonly StepRole[] = [
  { step: 1, id: "app-background", label: "App background", use: "Page canvas" },
  { step: 2, id: "subtle-background", label: "Subtle background", use: "Cards, striped rows" },
  { step: 3, id: "component-background", label: "Component background", use: "Resting controls" },
  { step: 4, id: "component-hover", label: "Hovered component background", use: "Hover" },
  {
    step: 5,
    id: "component-active",
    label: "Active component background",
    use: "Pressed, selected",
  },
  { step: 6, id: "border-subtle", label: "Subtle border", use: "Separators" },
  { step: 7, id: "border", label: "Border and focus ring", use: "Inputs, focus" },
  { step: 8, id: "border-hover", label: "Hovered border", use: "Hovered input" },
  { step: 9, id: "solid", label: "Solid background", use: "Buttons, badges, fills" },
  { step: 10, id: "solid-hover", label: "Hovered solid background", use: "Hovered fills" },
  { step: 11, id: "text-low", label: "Low-contrast text", use: "Secondary text, links" },
  { step: 12, id: "text-high", label: "High-contrast text", use: "Headings, body" },
];

export interface Step {
  step: number;
  role: string;
  hex: string;
  /** Measured from `hex`, so it describes what the swatch actually is. */
  oklch: Oklch;
}

export interface Palette {
  /** The normalised seed. */
  seed: string;
  light: Step[];
  dark: Step[];
}

// Ladder shape, read off --blue-1…12 (light) and its dark counterpart.
const LIGHT_L_TOP = [0.99, 0.972, 0.948, 0.917, 0.878] as const;
const LIGHT_C_TOP = [0.014, 0.047, 0.093, 0.158, 0.242] as const;
const DARK_L_TOP = [0.136, 0.174, 0.22, 0.27, 0.325] as const;
const DARK_C_TOP = [0.144, 0.223, 0.33, 0.442, 0.549] as const;
/** Positions of steps 6–8 along the way from step 5 to the solid. */
const BORDER_T = [0.25, 0.5, 0.75] as const;

/** Lightness the dark-mode solid may occupy: dark enough for a light label, light enough to show on a dark ground. */
const DARK_SOLID_L = [0.52, 0.78] as const;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function stepOf(index: number, hex: string): Step {
  return { step: index + 1, role: STEP_ROLES[index]?.id ?? "", hex, oklch: hexToOklch(hex) };
}

/**
 * Walk lightness in `direction` until `candidate` clears `minimum` against
 * `background`, giving up at the ends of the range (a seed that cannot reach the
 * target is then reported by `evaluatePairs`, not hidden).
 */
function pushUntilContrast(
  base: Oklch,
  background: string,
  minimum: number,
  direction: 1 | -1,
): string {
  let { l } = base;
  let hex = oklchToHex({ ...base, l });
  for (let i = 0; i < 80 && wcagContrast(hex, background) < minimum; i += 1) {
    l = clamp(l + direction * 0.01, 0, 1);
    hex = oklchToHex({ ...base, l });
  }
  return hex;
}

/** Build the 12 steps for one mode. Throws on an input that is not a hex colour. */
export function generateScale(seedHex: string, mode: Mode): Step[] {
  const seed = normalizeHex(seedHex);
  if (!seed) throw new Error(`generateScale: expected a hex colour, got "${seedHex}"`);

  const { l: seedL, c: seedC, h } = hexToOklch(seed);
  const at = (l: number, c: number) => oklchToHex({ l, c, h });

  const hexes: string[] = [];
  if (mode === "light") {
    for (let i = 0; i < 5; i += 1) {
      hexes.push(at(LIGHT_L_TOP[i] ?? 0, seedC * (LIGHT_C_TOP[i] ?? 0)));
    }
    // A pale seed would pull the borders lighter than the step they follow; cap
    // the interpolation target so 6–8 still read as borders.
    const anchorL = Math.min(seedL, 0.7);
    for (const t of BORDER_T) {
      hexes.push(at(lerp(LIGHT_L_TOP[4], anchorL, t), lerp(seedC * LIGHT_C_TOP[4], seedC, t)));
    }
    hexes.push(seed);
    hexes.push(at(seedL - 0.06, seedC * 0.953));

    const subtle = hexes[1] ?? seed;
    const lowL = clamp(seedL - 0.135, 0.34, 0.45);
    const low = pushUntilContrast({ l: lowL, c: seedC * 0.837, h }, subtle, 4.5, -1);
    hexes.push(low);
    const highL = clamp(Math.min(0.24, hexToOklch(low).l - 0.1), 0.15, 0.24);
    hexes.push(pushUntilContrast({ l: highL, c: seedC * 0.535, h }, subtle, 7, -1));
  } else {
    for (let i = 0; i < 5; i += 1) {
      hexes.push(at(DARK_L_TOP[i] ?? 0, seedC * (DARK_C_TOP[i] ?? 0)));
    }
    const solidL = clamp(seedL, DARK_SOLID_L[0], DARK_SOLID_L[1]);
    for (const t of BORDER_T) {
      hexes.push(at(lerp(DARK_L_TOP[4], solidL, t), lerp(seedC * DARK_C_TOP[4], seedC, t)));
    }
    hexes.push(at(solidL, seedC));
    hexes.push(at(solidL + 0.015, seedC * 0.95));

    const subtle = hexes[1] ?? seed;
    const low = pushUntilContrast({ l: 0.74, c: seedC * 0.49, h }, subtle, 4.5, 1);
    hexes.push(low);
    const highL = Math.max(0.905, hexToOklch(low).l + 0.1);
    hexes.push(pushUntilContrast({ l: Math.min(highL, 0.98), c: seedC * 0.2, h }, subtle, 7, 1));
  }
  return hexes.map((hex, index) => stepOf(index, hex));
}

export function generatePalette(seedHex: string): Palette {
  const seed = normalizeHex(seedHex);
  if (!seed) throw new Error(`generatePalette: expected a hex colour, got "${seedHex}"`);
  return { seed, light: generateScale(seed, "light"), dark: generateScale(seed, "dark") };
}

// ── contrast pairs ──────────────────────────────────────────────────────────

export interface PairSpec {
  id: string;
  label: string;
  /** A step number, or "ink": whichever of light / dark ink reads better on the solid. */
  fg: number | "ink";
  bg: number;
  /** What the pairing is for, which sets the bar. */
  kind: "text" | "strong-text" | "ui";
  wcagMin: number;
  apcaMin: number;
}

/**
 * Bars: WCAG 2.2 AA text 4.5:1, AAA 7:1, non-text UI 3:1 (SC 1.4.11). APCA bars
 * follow the Bronze simple-mode guidance: Lc 60 content text, Lc 75 body, Lc 45
 * large text and non-text.
 */
export const PAIRS: readonly PairSpec[] = [
  {
    id: "text-on-app",
    label: "Low-contrast text on app background",
    fg: 11,
    bg: 1,
    kind: "text",
    wcagMin: 4.5,
    apcaMin: 60,
  },
  {
    id: "text-on-subtle",
    label: "Low-contrast text on subtle background",
    fg: 11,
    bg: 2,
    kind: "text",
    wcagMin: 4.5,
    apcaMin: 60,
  },
  {
    id: "text-on-component",
    label: "Low-contrast text on component",
    fg: 11,
    bg: 3,
    kind: "text",
    wcagMin: 4.5,
    apcaMin: 60,
  },
  {
    id: "strong-text",
    label: "High-contrast text on subtle background",
    fg: 12,
    bg: 2,
    kind: "strong-text",
    wcagMin: 7,
    apcaMin: 75,
  },
  {
    id: "on-solid",
    label: "Label on solid",
    fg: "ink",
    bg: 9,
    kind: "text",
    wcagMin: 4.5,
    apcaMin: 60,
  },
  {
    id: "solid-graphic",
    label: "Solid as a graphic on app background",
    fg: 9,
    bg: 1,
    kind: "ui",
    wcagMin: 3,
    apcaMin: 45,
  },
  {
    id: "boundary",
    label: "Hovered border on app background",
    fg: 8,
    bg: 1,
    kind: "ui",
    wcagMin: 3,
    apcaMin: 45,
  },
];

export interface PairResult {
  id: string;
  label: string;
  kind: PairSpec["kind"];
  fgStep: number | "ink";
  bgStep: number;
  fg: string;
  bg: string;
  wcag: number;
  apca: number;
  wcagMin: number;
  apcaMin: number;
  passesWcag: boolean;
  passesApca: boolean;
}

const LIGHT_INK = oklchToHex({ l: 1, c: 0, h: 0 });

/**
 * The label colour for a solid fill: white, or a dark tint of the solid's own hue,
 * whichever contrasts better. A yellow button gets dark text, not a failing
 * white one.
 */
export function solidInk(steps: readonly Step[]): string {
  const solid = steps[8];
  if (!solid) throw new Error("solidInk: expected 12 steps");
  const darkInk = oklchToHex({ l: 0.24, c: solid.oklch.c * 0.4, h: solid.oklch.h });
  return wcagContrast(LIGHT_INK, solid.hex) >= wcagContrast(darkInk, solid.hex)
    ? LIGHT_INK
    : darkInk;
}

export function evaluatePairs(steps: readonly Step[]): PairResult[] {
  const hexOf = (step: number) => steps[step - 1]?.hex ?? "";
  return PAIRS.map((spec) => {
    const fg = spec.fg === "ink" ? solidInk(steps) : hexOf(spec.fg);
    const bg = hexOf(spec.bg);
    const wcag = wcagContrast(fg, bg);
    const apca = apcaLc(fg, bg);
    return {
      id: spec.id,
      label: spec.label,
      kind: spec.kind,
      fgStep: spec.fg,
      bgStep: spec.bg,
      fg,
      bg,
      wcag,
      apca,
      wcagMin: spec.wcagMin,
      apcaMin: spec.apcaMin,
      passesWcag: wcag >= spec.wcagMin,
      passesApca: Math.abs(apca) >= spec.apcaMin,
    };
  });
}

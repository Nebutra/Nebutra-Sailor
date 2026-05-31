import { THEME_TOKEN_SETS, type ThemeTokenSetId } from "@nebutra/design-tokens/themes";
import type { CSSProperties } from "react";

/**
 * Estimate the perceptual lightness (0..1) of a CSS color value.
 *
 * Handles:
 *   - `oklch(L ...)` — extracts the L component directly.
 *   - `#rgb` / `#rrggbb` — converts to linear-light sRGB relative luminance.
 *   - `rgb(...)`/`rgba(...)` — same luminance from the channel values.
 *   - Anything else — returns 0.5 (neutral fallback).
 *
 * Exported so it can be unit-tested independently.
 */
export function estimateLightness(value: string): number {
  const trimmed = value.trim();

  // ── oklch(L C H) ────────────────────────────────────────────────────────────
  const oklchMatch = trimmed.match(/^oklch\(\s*([0-9.]+)/i);
  if (oklchMatch) {
    return Number.parseFloat(oklchMatch[1] ?? "0.5");
  }

  // ── hex: #rgb or #rrggbb ────────────────────────────────────────────────────
  const hex3 = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (hex3) {
    const r = parseInt(`${hex3[1]}${hex3[1]}`, 16) / 255;
    const g = parseInt(`${hex3[2]}${hex3[2]}`, 16) / 255;
    const b = parseInt(`${hex3[3]}${hex3[3]}`, 16) / 255;
    return linearLuminance(r, g, b);
  }
  const hex6 = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex6) {
    const r = parseInt(hex6[1] ?? "0", 16) / 255;
    const g = parseInt(hex6[2] ?? "0", 16) / 255;
    const b = parseInt(hex6[3] ?? "0", 16) / 255;
    return linearLuminance(r, g, b);
  }

  // ── rgb(...) / rgba(...) ────────────────────────────────────────────────────
  const rgbMatch = trimmed.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
  if (rgbMatch) {
    const r = Number.parseFloat(rgbMatch[1] ?? "0") / 255;
    const g = Number.parseFloat(rgbMatch[2] ?? "0") / 255;
    const b = Number.parseFloat(rgbMatch[3] ?? "0") / 255;
    return linearLuminance(r, g, b);
  }

  return 0.5;
}

/** Linearise a single sRGB channel (0..1) and compute relative luminance. */
function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance: 0 = black, 1 = white. */
function linearLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

export type ThemeMode = "light" | "dark";
export type ThemeId = ThemeTokenSetId;

type DtcgLeaf = { $value?: string; $type?: string };

export type ThemeTokenSet = {
  color?: Record<string, DtcgLeaf | undefined>;
  radius?: Record<string, DtcgLeaf | undefined>;
  fontFamily?: Record<string, DtcgLeaf | undefined>;
  fontSize?: Record<string, DtcgLeaf | undefined>;
  fontWeight?: Record<string, DtcgLeaf | undefined>;
  shadow?: Record<string, DtcgLeaf | undefined>;
  spacing?: Record<string, DtcgLeaf | undefined>;
};

export type TokenRow = { name: string; value: string };

const themeTokenSets = THEME_TOKEN_SETS as Record<ThemeId, ThemeTokenSet>;

// Hard-coded status-color fallbacks for themes that don't declare them.
const STATUS_COLOR_FALLBACKS: Record<string, string> = {
  destructive: "hsl(0 84% 45%)",
  "destructive-foreground": "hsl(0 0% 100%)",
  success: "hsl(142 71% 36%)",
  "success-foreground": "hsl(222 47% 4%)",
  warning: "hsl(38 92% 50%)",
  "warning-foreground": "hsl(222 47% 4%)",
  info: "hsl(228 95% 67%)",
  "info-foreground": "hsl(222 47% 4%)",
};

// Mode-default surface colors so a theme that only declares brand colors still
// renders sensibly in light/dark. All in oklch so they compose with theme tokens.
const MODE_SURFACE_FALLBACKS: Record<ThemeMode, Record<string, string>> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.141 0.005 285.9)",
    // Push card a hair darker than canvas so layering reads without a border.
    card: "oklch(0.985 0 0)",
    "card-foreground": "oklch(0.141 0.005 285.9)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.141 0.005 285.9)",
    muted: "oklch(0.965 0.001 286)",
    "muted-foreground": "oklch(0.552 0.016 286)",
    border: "oklch(0 0 0 / 0.06)",
    input: "oklch(0 0 0 / 0.07)",
    ring: "oklch(0.546 0.245 262.9)",
  },
  dark: {
    // Linear / Vercel pattern (per industry research): 5–8% L step per
    // elevation tier, hairline borders, OFF-white text (#E5E5E5 not pure
    // white) to reduce eye strain. Four-tier surface system:
    //   canvas → card → popover → muted/overlay
    background: "oklch(0.16 0.005 285.9)", // ≈ #161616 — charcoal not pitch
    // 2026-05 perf governance: foreground restored to pure white (was 0.93
    // off-white per "WCAG eye-strain" rationale). The off-white reads "soft"
    // / "blurry" for dashboard surfaces where you want CRISP numbers/labels.
    // Pure white on a 0.16 charcoal is plenty contrast without strain.
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.215 0.005 285.9)", // +0.055 L = card lifts clearly
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.265 0.005 285.9)", // +0.05 L = nested tier
    "popover-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.305 0.005 285.9)",
    "muted-foreground": "oklch(0.73 0.012 286)", // bumped from 0.7 for sharper secondary text
    // Dark mode: border INVISIBLE. The 5% L bg-tier step alone defines edges.
    // Stacking a 6% white hairline ON TOP of an already-visible bg-tier
    // transition reads as "doubled line" — the literal "硬白线" complaint.
    // Pick one edge cue, not both.
    border: "transparent",
    input: "oklch(1 0 0 / 0.06)",
    ring: "oklch(0.546 0.245 262.9)",
  },
};

const SURFACE_COLOR_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "ring",
] as const;

const BRAND_COLOR_KEYS = [
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "info",
  "info-foreground",
] as const;

function tokenValue(group: Record<string, DtcgLeaf | undefined> | undefined, key: string) {
  return group?.[key]?.$value;
}

function setVar(target: Record<string, string>, name: string, value: string | undefined) {
  if (value) target[name] = value;
}

/**
 * Build a CSS-variables style object from an arbitrary ThemeTokenSet.
 * All surface/brand/radius/font/shadow logic lives here.
 * Called by getThemePreviewStyle (built-in themes) and the DESIGN.md bridge
 * (imported themes from Slice B onwards).
 */
export function getPreviewStyleFromTokenSet(theme: ThemeTokenSet, mode: ThemeMode): CSSProperties {
  const surfaceFallback = MODE_SURFACE_FALLBACKS[mode];
  const vars: Record<string, string> = { colorScheme: mode };

  // Surface precedence — three rules, in order:
  //   1. DARK mode: fallback always wins (Linear-pattern dark uniform across themes).
  //   2. LIGHT mode + theme is LIGHT-DESIGNED (theme.bg L > 0.5): theme wins
  //      so its native multi-tier aesthetic (e.g. Vibrant cream/white/grey)
  //      comes through.
  //   3. LIGHT mode + theme is DARK-DESIGNED (Neon, Dark Dense): fallback wins
  //      so user can still preview the theme's brand colors on a light surface.
  const themeBgValue = tokenValue(theme.color, "background");
  const themeIsLightDesigned = estimateLightness(themeBgValue ?? "") > 0.5;
  const themeWinsSurface = mode === "light" && themeIsLightDesigned;

  for (const key of SURFACE_COLOR_KEYS) {
    const themeVal = tokenValue(theme.color, key);
    const value = themeWinsSurface
      ? (themeVal ?? surfaceFallback[key])
      : (surfaceFallback[key] ?? themeVal);
    setVar(vars, `--color-${key}`, value);
  }

  // Brand colors stay theme-driven, but a theme can define a `-dark` variant
  // (e.g. `primary-dark`) and that wins in dark mode — important for themes
  // whose default primary was designed for one mode and disappears on the
  // other (Minimal's near-black primary vanishes on a dark canvas).
  for (const key of BRAND_COLOR_KEYS) {
    const themeValue =
      (mode === "dark" ? tokenValue(theme.color, `${key}-dark`) : undefined) ??
      tokenValue(theme.color, key);
    setVar(vars, `--color-${key}`, themeValue ?? STATUS_COLOR_FALLBACKS[key]);
  }

  // Optional brand gradient — themes that define one get a real Nebutra-style
  // gradient CTA; themes that don't fall back to flat primary via CSS var().
  // Dark mode prefers a dimmed variant if defined, because the light-mode
  // cyan endpoint reads almost white on dark surfaces (looks like a stray line).
  const gradient =
    (mode === "dark" ? tokenValue(theme.color, "brand-gradient-dark") : undefined) ??
    tokenValue(theme.color, "brand-gradient");
  setVar(vars, `--color-brand-gradient`, gradient);

  for (const key of ["sm", "md", "lg", "xl", "full"]) {
    setVar(vars, `--radius-${key}`, tokenValue(theme.radius, key));
  }

  // Always emit --font-sans and --font-heading so the preview wrapper fully
  // shadows the app-global definitions — if the theme/import doesn't declare
  // them, fall back to safe generic stacks so var() resolution stays inside the
  // preview subtree and never leaks to the app's Geist / Noto globals.
  const resolvedSans =
    tokenValue(theme.fontFamily, "sans") ?? "ui-sans-serif, system-ui, -apple-system, sans-serif";
  vars["--font-sans"] = resolvedSans;

  // --font-heading: use the theme value if present, otherwise mirror --font-sans
  // so var(--font-heading) inside the preview resolves HERE and not to the
  // app-global @layer base value.
  const resolvedHeading = tokenValue(theme.fontFamily, "heading") ?? resolvedSans;
  vars["--font-heading"] = resolvedHeading;

  setVar(vars, "--font-mono", tokenValue(theme.fontFamily, "mono"));

  for (const key of ["sm", "md", "lg", "xl"]) {
    setVar(vars, `--shadow-${key}`, tokenValue(theme.shadow, key));
  }

  for (const key of ["sm", "md", "lg", "xl"]) {
    setVar(vars, `--spacing-${key}`, tokenValue(theme.spacing, key));
  }

  // Type-scale — emitted so the preview canvas consumes them.
  // --text-base  → applied to body <p> text in the preview.
  // --text-heading → NOT applied to card <h3> titles (they are section labels,
  //   not page-h1s; a 3rem import value would distort the card layout).
  //   The var is emitted for completeness so downstream uses can opt in.
  // --font-weight-heading → applied to card <h3> titles so an import with
  //   fontWeight.heading 300 visibly lightens all section headings.
  setVar(vars, "--text-base", tokenValue(theme.fontSize, "base"));
  setVar(vars, "--text-heading", tokenValue(theme.fontSize, "heading"));
  setVar(vars, "--font-weight-heading", tokenValue(theme.fontWeight, "heading"));

  // Edge tokens — mirror the global :root/.dark definitions (static/base.css)
  // but injected as inline style so they work inside the playground canvas
  // (which doesn't toggle the .dark class — it switches via inline colorScheme).
  if (mode === "dark") {
    vars["--edge-faint"] = "rgb(255 255 255 / 0.04)";
    vars["--edge-soft"] = "rgb(255 255 255 / 0.06)";
    vars["--edge-medium"] = "rgb(255 255 255 / 0.1)";
    vars["--halo-faint"] = "rgb(255 255 255 / 0.03)";
  } else {
    vars["--edge-faint"] = "rgb(0 0 0 / 0.04)";
    vars["--edge-soft"] = "rgb(0 0 0 / 0.07)";
    vars["--edge-medium"] = "rgb(0 0 0 / 0.12)";
    vars["--halo-faint"] = "rgb(0 0 0 / 0.03)";
  }

  return vars as CSSProperties;
}

export function getThemePreviewStyle(themeId: string, mode: ThemeMode): CSSProperties {
  return getPreviewStyleFromTokenSet(
    themeTokenSets[themeId as ThemeId] ?? themeTokenSets.nebutra,
    mode,
  );
}

export function getSwatchesFromTokenSet(theme: ThemeTokenSet): string[] {
  return [
    tokenValue(theme.color, "primary"),
    tokenValue(theme.color, "secondary"),
    tokenValue(theme.color, "accent"),
    tokenValue(theme.color, "background"),
    tokenValue(theme.color, "card"),
    tokenValue(theme.color, "border"),
  ].filter((value): value is string => Boolean(value));
}

export function getThemeSwatches(themeId: string): string[] {
  const theme = themeTokenSets[themeId as ThemeId] ?? themeTokenSets.nebutra;
  return getSwatchesFromTokenSet(theme);
}

export function getTokenRows(themeId: string, mode: ThemeMode): TokenRow[] {
  const style = getThemePreviewStyle(themeId, mode) as Record<string, string>;
  return [
    "--color-primary",
    "--color-primary-foreground",
    "--color-secondary",
    "--color-accent",
    "--color-background",
    "--color-foreground",
    "--color-card",
    "--color-muted",
    "--color-border",
    "--color-ring",
    "--radius-md",
    "--font-sans",
  ].flatMap((name) => {
    const value = style[name];
    return value ? [{ name, value }] : [];
  });
}

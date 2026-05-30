import { THEME_TOKEN_SETS, type ThemeTokenSetId } from "@nebutra/design-tokens/themes";
import type { CSSProperties } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeId = ThemeTokenSetId;

type DtcgLeaf = { $value?: string; $type?: string };

export type ThemeTokenSet = {
  color?: Record<string, DtcgLeaf | undefined>;
  radius?: Record<string, DtcgLeaf | undefined>;
  fontFamily?: Record<string, DtcgLeaf | undefined>;
  shadow?: Record<string, DtcgLeaf | undefined>;
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
    foreground: "oklch(0.93 0 0)", // off-white, not 0.985 (which causes glow)
    card: "oklch(0.215 0.005 285.9)", // +0.055 L = card lifts clearly
    "card-foreground": "oklch(0.93 0 0)",
    popover: "oklch(0.265 0.005 285.9)", // +0.05 L = nested tier
    "popover-foreground": "oklch(0.93 0 0)",
    muted: "oklch(0.305 0.005 285.9)",
    "muted-foreground": "oklch(0.7 0.012 286)",
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
  const themeBgL = themeBgValue
    ? Number.parseFloat(themeBgValue.match(/oklch\(([0-9.]+)/)?.[1] ?? "0.5")
    : 0.5;
  const themeIsLightDesigned = themeBgL > 0.5;
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

  for (const key of ["sans", "mono", "heading"]) {
    setVar(vars, `--font-${key}`, tokenValue(theme.fontFamily, key));
  }

  for (const key of ["sm", "md", "lg", "xl"]) {
    setVar(vars, `--shadow-${key}`, tokenValue(theme.shadow, key));
  }

  return vars as CSSProperties;
}

export function getThemePreviewStyle(themeId: string, mode: ThemeMode): CSSProperties {
  return getPreviewStyleFromTokenSet(
    themeTokenSets[themeId as ThemeId] ?? themeTokenSets.neon,
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
  const theme = themeTokenSets[themeId as ThemeId] ?? themeTokenSets.neon;
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

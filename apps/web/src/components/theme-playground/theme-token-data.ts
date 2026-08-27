/**
 * Preview helpers for Theme Playground / Appearance.
 *
 * Multi-mood oklch THEME_TOKEN_SETS were removed. Previews use:
 *   - MODE_TOKEN_SETS (light/dark product SSOT)
 *   - Brand Package design languages via getBuiltInBrandPackage (SSOT)
 */
import { MODE_TOKEN_SETS, type ModeTokenSetId } from "@nebutra/design-tokens/themes";
import { getBuiltInBrandPackage } from "@nebutra/theme/client";
import type { BrandPackage } from "@nebutra/tokens/brand-package";
import type { CSSProperties } from "react";

export type ThemeMode = "light" | "dark";
/** Design language id or factory */
export type ThemeId = string;

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

const modeTokenSets = MODE_TOKEN_SETS as Record<ModeTokenSetId, ThemeTokenSet>;

function channelsToCss(channels: string | undefined, fallback: string): string {
  if (!channels) return fallback;
  const v = channels.trim();
  if (v.startsWith("#") || v.startsWith("hsl") || v.startsWith("oklch") || v.startsWith("rgb")) {
    return v;
  }
  return `hsl(${v})`;
}

/**
 * Estimate the perceptual lightness (0..1) of a CSS color value.
 */
export function estimateLightness(value: string): number {
  const trimmed = value.trim();
  const oklchMatch = trimmed.match(/^oklch\(\s*([0-9.]+)/i);
  if (oklchMatch) {
    return Number.parseFloat(oklchMatch[1] ?? "0.5");
  }
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
  const hslMatch = trimmed.match(/hsl\(\s*[\d.]+\s+[\d.]+%\s+([\d.]+)%/i);
  if (hslMatch) {
    return Number.parseFloat(hslMatch[1] ?? "50") / 100;
  }
  const rgbMatch = trimmed.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
  if (rgbMatch) {
    const r = Number.parseFloat(rgbMatch[1] ?? "0") / 255;
    const g = Number.parseFloat(rgbMatch[2] ?? "0") / 255;
    const b = Number.parseFloat(rgbMatch[3] ?? "0") / 255;
    return linearLuminance(r, g, b);
  }
  return 0.5;
}

function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function tokenValue(
  group: Record<string, DtcgLeaf | undefined> | undefined,
  key: string,
): string | undefined {
  const leaf = group?.[key];
  return typeof leaf?.$value === "string" ? leaf.$value : undefined;
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

function swatchesFromBrand(brand: BrandPackage, mode: ThemeMode = "light"): string[] {
  const s = semanticForMode(brand, mode);
  return [
    channelsToCss(s.primary, "#3b82f6"),
    channelsToCss(s.secondary, "#e5e5e5"),
    channelsToCss(s.accent, "#a3a3a3"),
    channelsToCss(s.background, "#0a0a0a"),
    channelsToCss(s.card, "#171717"),
    channelsToCss(s.border, "#333333"),
  ];
}

const FACTORY_SWATCHES = [
  "hsl(228 85% 56%)",
  "hsl(210 40% 96%)",
  "hsl(210 40% 96%)",
  "hsl(0 0% 100%)",
  "hsl(0 0% 100%)",
  "hsl(214 32% 91%)",
];

export function getThemeSwatches(themeId: string, mode: ThemeMode = "light"): string[] {
  if (!themeId || themeId === "factory" || themeId === "default" || themeId === "nebutra") {
    return FACTORY_SWATCHES;
  }
  const brand = getBuiltInBrandPackage(themeId);
  if (brand) return swatchesFromBrand(brand, mode);
  // light/dark mode token sets
  if (themeId === "light" || themeId === "dark") {
    return getSwatchesFromTokenSet(modeTokenSets[themeId]);
  }
  return FACTORY_SWATCHES;
}

function semanticForMode(brand: BrandPackage, mode: ThemeMode): BrandPackage["semantic"] {
  const dual = brand.modes?.[mode]?.semantic;
  if (dual) return dual;
  return brand.semantic;
}

function previewFromBrand(brand: BrandPackage, mode: ThemeMode = "light"): CSSProperties {
  const s = semanticForMode(brand, mode);
  const vars: Record<string, string> = {
    "--color-primary": channelsToCss(s.primary, "#3b82f6"),
    "--color-primary-foreground": channelsToCss(s.primaryForeground, "#fff"),
    "--color-secondary": channelsToCss(s.secondary, "#e5e5e5"),
    "--color-secondary-foreground": channelsToCss(s.secondaryForeground, "#111"),
    "--color-accent": channelsToCss(s.accent, "#e5e5e5"),
    "--color-accent-foreground": channelsToCss(s.accentForeground, "#111"),
    "--color-background": channelsToCss(s.background, "#fff"),
    "--color-foreground": channelsToCss(s.foreground, "#111"),
    "--color-card": channelsToCss(s.card, "#fff"),
    "--color-card-foreground": channelsToCss(s.cardForeground, "#111"),
    "--color-muted": channelsToCss(s.muted, "#f5f5f5"),
    "--color-muted-foreground": channelsToCss(s.mutedForeground, "#737373"),
    "--color-border": channelsToCss(s.border, "#e5e5e5"),
    "--color-input": channelsToCss(s.input, "#e5e5e5"),
    "--color-ring": channelsToCss(s.ring, s.primary),
    "--color-destructive": channelsToCss(s.destructive, "hsl(0 84% 45%)"),
    "--color-destructive-foreground": channelsToCss(s.destructiveForeground, "#fff"),
  };
  return vars as CSSProperties;
}

export function getThemePreviewStyle(themeId: string, mode: ThemeMode): CSSProperties {
  const brand = themeId ? getBuiltInBrandPackage(themeId) : undefined;
  if (brand) {
    return previewFromBrand(brand, mode);
  }
  // Factory / light-dark: use mode surfaces from MODE_TOKEN_SETS
  const set = modeTokenSets[mode] ?? modeTokenSets.light;
  const primary = tokenValue(set.color, "primary") ?? "hsl(228 85% 56%)";
  const bg = tokenValue(set.color, "background") ?? (mode === "dark" ? "#0a0a0a" : "#ffffff");
  const fg = tokenValue(set.color, "foreground") ?? (mode === "dark" ? "#fafafa" : "#0a0a0a");
  const card = tokenValue(set.color, "card") ?? bg;
  const border = tokenValue(set.color, "border") ?? (mode === "dark" ? "#27272a" : "#e4e4e7");
  return {
    "--color-primary": primary,
    "--color-primary-foreground":
      tokenValue(set.color, "primary-foreground") ?? (mode === "dark" ? "#0a0a0a" : "#ffffff"),
    "--color-background": bg,
    "--color-foreground": fg,
    "--color-card": card,
    "--color-card-foreground": tokenValue(set.color, "card-foreground") ?? fg,
    "--color-border": border,
    "--color-muted": tokenValue(set.color, "muted") ?? border,
    "--color-muted-foreground": tokenValue(set.color, "muted-foreground") ?? fg,
    "--color-secondary": tokenValue(set.color, "secondary") ?? border,
    "--color-secondary-foreground": tokenValue(set.color, "secondary-foreground") ?? fg,
    "--color-accent": tokenValue(set.color, "accent") ?? border,
    "--color-accent-foreground": tokenValue(set.color, "accent-foreground") ?? fg,
    "--color-input": tokenValue(set.color, "input") ?? border,
    "--color-ring": tokenValue(set.color, "ring") ?? primary,
  } as CSSProperties;
}

export function getTokenSet(themeId: string): ThemeTokenSet | undefined {
  if (themeId === "light" || themeId === "dark") return modeTokenSets[themeId];
  return undefined;
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
    "--color-border",
    "--color-muted",
    "--color-ring",
  ]
    .filter((name) => style[name])
    .map((name) => ({ name, value: style[name] as string }));
}

export function getBrandPackage(themeId: string): BrandPackage | undefined {
  return getBuiltInBrandPackage(themeId);
}

// ── Arbitrary ThemeTokenSet → CSS vars (DESIGN.md import / custom export) ──

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

const MODE_SURFACE_FALLBACKS: Record<ThemeMode, Record<string, string>> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.141 0.005 285.9)",
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
    background: "oklch(0.14 0.005 285.9)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.18 0.006 285.9)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.18 0.006 285.9)",
    "popover-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.24 0.006 286)",
    "muted-foreground": "oklch(0.7 0.015 286)",
    border: "oklch(1 0 0 / 0.1)",
    input: "oklch(1 0 0 / 0.12)",
    ring: "oklch(0.55 0.2 264)",
  },
};

function setVar(target: Record<string, string>, name: string, value: string | undefined) {
  if (value) target[name] = value;
}

/**
 * Build a CSS-variables style object from an arbitrary ThemeTokenSet
 * (DESIGN.md import preview, custom export path).
 */
export function getPreviewStyleFromTokenSet(theme: ThemeTokenSet, mode: ThemeMode): CSSProperties {
  const surfaceFallback = MODE_SURFACE_FALLBACKS[mode];
  const vars: Record<string, string> = { colorScheme: mode };

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

  for (const key of BRAND_COLOR_KEYS) {
    const themeValue =
      (mode === "dark" ? tokenValue(theme.color, `${key}-dark`) : undefined) ??
      tokenValue(theme.color, key);
    setVar(vars, `--color-${key}`, themeValue ?? STATUS_COLOR_FALLBACKS[key]);
  }

  const gradient =
    (mode === "dark" ? tokenValue(theme.color, "brand-gradient-dark") : undefined) ??
    tokenValue(theme.color, "brand-gradient");
  setVar(vars, "--color-brand-gradient", gradient);

  for (const key of ["sm", "md", "lg", "xl", "full"]) {
    setVar(vars, `--radius-${key}`, tokenValue(theme.radius, key));
  }

  const resolvedSans =
    tokenValue(theme.fontFamily, "sans") ?? "ui-sans-serif, system-ui, -apple-system, sans-serif";
  vars["--font-sans"] = resolvedSans;
  vars["--font-heading"] = tokenValue(theme.fontFamily, "heading") ?? resolvedSans;
  setVar(vars, "--font-mono", tokenValue(theme.fontFamily, "mono"));

  for (const key of ["sm", "md", "lg", "xl"]) {
    setVar(vars, `--shadow-${key}`, tokenValue(theme.shadow, key));
    setVar(vars, `--spacing-${key}`, tokenValue(theme.spacing, key));
  }

  setVar(vars, "--text-base", tokenValue(theme.fontSize, "base"));
  setVar(vars, "--text-heading", tokenValue(theme.fontSize, "heading"));
  setVar(vars, "--font-weight-heading", tokenValue(theme.fontWeight, "heading"));

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

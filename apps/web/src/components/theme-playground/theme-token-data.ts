import { THEME_TOKEN_SETS, type ThemeTokenSetId } from "@nebutra/design-tokens/themes";
import type { CSSProperties } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeId = ThemeTokenSetId;

type DtcgLeaf = { $value?: string; $type?: string };

type ThemeTokenSet = {
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
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.141 0.005 285.9)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.141 0.005 285.9)",
    muted: "oklch(0.967 0.001 286)",
    "muted-foreground": "oklch(0.552 0.016 286)",
    border: "oklch(0.922 0.004 286)",
    input: "oklch(0.922 0.004 286)",
    ring: "oklch(0.546 0.245 262.9)",
  },
  dark: {
    background: "oklch(0.141 0.005 285.9)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.162 0.004 285.9)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.162 0.004 285.9)",
    "popover-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.215 0.006 285.9)",
    "muted-foreground": "oklch(0.71 0.013 286)",
    border: "oklch(0.215 0.006 285.9)",
    input: "oklch(0.215 0.006 285.9)",
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

export function getThemePreviewStyle(themeId: string, mode: ThemeMode): CSSProperties {
  const theme = themeTokenSets[themeId as ThemeId] ?? themeTokenSets.neon;
  const surfaceFallback = MODE_SURFACE_FALLBACKS[mode];
  const vars: Record<string, string> = { colorScheme: mode };

  for (const key of SURFACE_COLOR_KEYS) {
    setVar(vars, `--color-${key}`, tokenValue(theme.color, key) ?? surfaceFallback[key]);
  }

  for (const key of BRAND_COLOR_KEYS) {
    setVar(vars, `--color-${key}`, tokenValue(theme.color, key) ?? STATUS_COLOR_FALLBACKS[key]);
  }

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

export function getThemeSwatches(themeId: string): string[] {
  const theme = themeTokenSets[themeId as ThemeId] ?? themeTokenSets.neon;
  return [
    tokenValue(theme.color, "primary"),
    tokenValue(theme.color, "secondary"),
    tokenValue(theme.color, "accent"),
    tokenValue(theme.color, "background"),
    tokenValue(theme.color, "card"),
    tokenValue(theme.color, "border"),
  ].filter((value): value is string => Boolean(value));
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

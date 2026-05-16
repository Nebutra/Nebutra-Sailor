import {
  MODE_TOKEN_SETS,
  THEME_TOKEN_SETS,
  type ThemeTokenSetId,
} from "@nebutra/design-tokens/themes";
import type { CSSProperties } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeId = ThemeTokenSetId;

type DtcgLeaf = {
  $value?: string;
  $type?: string;
};

type ThemeTokenSet = {
  color?: Record<string, DtcgLeaf | undefined>;
  radius?: Record<string, DtcgLeaf | undefined>;
  fontFamily?: Record<string, DtcgLeaf | undefined>;
  shadow?: Record<string, DtcgLeaf | undefined>;
};

type ModeTokenSet = {
  shadcn: Record<string, DtcgLeaf | undefined>;
  elevation?: Record<string, DtcgLeaf | undefined>;
};

export type TokenRow = {
  name: string;
  value: string;
};

const themeTokenSets = THEME_TOKEN_SETS as Record<ThemeId, ThemeTokenSet>;
const modeTokenSets = MODE_TOKEN_SETS as Record<ThemeMode, ModeTokenSet>;

const STATUS_COLOR_FALLBACKS = {
  destructive: "hsl(0 84% 45%)",
  "destructive-foreground": "hsl(0 0% 100%)",
  success: "hsl(142 71% 36%)",
  "success-foreground": "hsl(222 47% 4%)",
  warning: "hsl(38 92% 50%)",
  "warning-foreground": "hsl(222 47% 4%)",
  info: "hsl(228 95% 67%)",
  "info-foreground": "hsl(222 47% 4%)",
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

function hslValue(tokens: ModeTokenSet, key: string) {
  const value = tokenValue(tokens.shadcn, key);
  return value ? `hsl(${value})` : undefined;
}

function modeSurface(mode: ThemeMode, key: string) {
  return hslValue(modeTokenSets[mode], key);
}

function themeColor(theme: ThemeTokenSet, key: string) {
  return tokenValue(theme.color, key);
}

function themeRadius(theme: ThemeTokenSet, key: string) {
  return tokenValue(theme.radius, key);
}

function themeShadow(theme: ThemeTokenSet, key: string, mode: ThemeMode) {
  return tokenValue(theme.shadow, key) ?? tokenValue(modeTokenSets[mode].elevation, key);
}

function setVar(target: Record<string, string>, name: string, value: string | undefined) {
  if (value) {
    target[name] = value;
  }
}

export function getThemePreviewStyle(themeId: string, mode: ThemeMode): CSSProperties {
  const theme = themeTokenSets[themeId as ThemeId] ?? themeTokenSets.neon;
  const vars: Record<string, string> = {
    colorScheme: mode,
  };

  for (const key of SURFACE_COLOR_KEYS) {
    setVar(vars, `--color-${key}`, modeSurface(mode, key) ?? themeColor(theme, key));
    setVar(vars, `--${key}`, tokenValue(modeTokenSets[mode].shadcn, key));
  }

  for (const key of BRAND_COLOR_KEYS) {
    setVar(
      vars,
      `--color-${key}`,
      themeColor(theme, key) ??
        modeSurface(mode, key) ??
        STATUS_COLOR_FALLBACKS[key as keyof typeof STATUS_COLOR_FALLBACKS],
    );
    setVar(vars, `--${key}`, tokenValue(modeTokenSets[mode].shadcn, key));
  }

  for (const key of ["sm", "md", "lg", "xl", "full"]) {
    setVar(vars, `--radius-${key}`, themeRadius(theme, key));
  }

  for (const key of ["sans", "mono", "heading"]) {
    setVar(vars, `--font-${key}`, tokenValue(theme.fontFamily, key));
  }

  for (const key of ["sm", "md", "lg", "xl"]) {
    setVar(vars, `--shadow-${key}`, themeShadow(theme, key, mode));
  }

  return vars as CSSProperties;
}

export function getThemeSwatches(themeId: string): string[] {
  const theme = themeTokenSets[themeId as ThemeId] ?? themeTokenSets.neon;
  return [
    themeColor(theme, "primary"),
    themeColor(theme, "secondary"),
    themeColor(theme, "accent"),
    themeColor(theme, "background"),
    themeColor(theme, "card"),
    themeColor(theme, "border"),
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

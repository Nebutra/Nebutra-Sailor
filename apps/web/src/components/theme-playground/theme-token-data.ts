/**
 * Display data for Theme Playground / Appearance: swatches for registry rows
 * and pickers.
 *
 * Applying a theme lives in `preview-carrier.ts` — the Brand Package carrier
 * the app itself uses. This module used to carry a second preview pipeline
 * (inline `--color-*` maps, fallback palettes, lightness probing) that read a
 * `color` group the mode token sets do not have, so factory previews silently
 * painted stale hardcoded colors. That pipeline is gone.
 */
import { MODE_TOKEN_SETS, type ModeTokenSetId } from "@nebutra/design-tokens/themes";
import { getBuiltInBrandPackage } from "@nebutra/theme/client";
import type { BrandPackage } from "@nebutra/tokens/brand-package";

export type ThemeMode = "light" | "dark";
/** Design language id or factory alias. */
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

/** The mode token sets' `shadcn` group — the DTCG mirror of styles.css. */
type ModeTokenSet = { shadcn?: Record<string, DtcgLeaf | undefined> };

const modeTokenSets = MODE_TOKEN_SETS as Record<ModeTokenSetId, ModeTokenSet>;

/**
 * Wrap an HSL channel triple the way every consumer does (`hsl(var(--x))`).
 * Complete colors (hex/oklch/rgb/hsl) pass through untouched.
 */
export function channelsToCss(channels: string | undefined, fallback: string): string {
  const v = channels?.trim();
  if (!v) return fallback;
  if (v.startsWith("#") || v.startsWith("hsl") || v.startsWith("oklch") || v.startsWith("rgb")) {
    return v;
  }
  return `hsl(${v})`;
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

function semanticForMode(brand: BrandPackage, mode: ThemeMode): BrandPackage["semantic"] {
  return brand.modes?.[mode]?.semantic ?? brand.semantic;
}

function swatchesFromBrand(brand: BrandPackage, mode: ThemeMode): string[] {
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

/** Factory / light / dark swatches, read from the mode SSOT. */
function swatchesFromMode(mode: ThemeMode): string[] {
  const set = modeTokenSets[mode] ?? modeTokenSets.light;
  return ["primary", "secondary", "accent", "background", "card", "border"]
    .map((key) => channelsToCss(tokenValue(set.shadcn, key), "transparent"))
    .filter((value) => value !== "transparent");
}

export function getThemeSwatches(themeId: string, mode: ThemeMode = "light"): string[] {
  if (themeId === "light" || themeId === "dark") {
    return swatchesFromMode(themeId);
  }
  const brand = themeId ? getBuiltInBrandPackage(themeId) : undefined;
  if (brand) return swatchesFromBrand(brand, mode);
  // factory / default / nebutra / unknown — the product chrome SSOT
  return swatchesFromMode(mode);
}

import { normalizeBrandPackage } from "../brand-package/normalize";
import type { BrandPackage, BrandSemanticColors } from "../brand-package/types";
import { type TokenMode, tokenValue } from "../values";

/**
 * The House tokens (`factory`) as a Brand Package, so a preset can start from
 * them like from any language. Built from TOKEN_VALUES — the same values
 * styles.css ships — so nothing here restates a colour.
 *
 * A preset that changes nothing over factory emits nothing (the project keeps
 * styles.css as is); this package is only the base the knobs act on.
 */
export function factoryBrandPackage(): BrandPackage {
  const semantic = (mode: TokenMode): BrandSemanticColors => ({
    background: tokenValue("--background", mode),
    foreground: tokenValue("--foreground", mode),
    card: tokenValue("--card", mode),
    cardForeground: tokenValue("--card-foreground", mode),
    popover: tokenValue("--popover", mode),
    popoverForeground: tokenValue("--popover-foreground", mode),
    primary: tokenValue("--primary", mode),
    primaryForeground: tokenValue("--primary-foreground", mode),
    secondary: tokenValue("--secondary", mode),
    secondaryForeground: tokenValue("--secondary-foreground", mode),
    muted: tokenValue("--muted", mode),
    mutedForeground: tokenValue("--muted-foreground", mode),
    accent: tokenValue("--accent", mode),
    accentForeground: tokenValue("--accent-foreground", mode),
    destructive: tokenValue("--destructive", mode),
    destructiveForeground: tokenValue("--destructive-foreground", mode),
    border: tokenValue("--border", mode),
    input: tokenValue("--input", mode),
    ring: tokenValue("--ring", mode),
    success: tokenValue("--success", mode),
    successForeground: tokenValue("--success-foreground", mode),
    warning: tokenValue("--warning", mode),
    warningForeground: tokenValue("--warning-foreground", mode),
    info: tokenValue("--info", mode),
    infoForeground: tokenValue("--info-foreground", mode),
  });

  return normalizeBrandPackage({
    id: "factory",
    name: "Nebutra Factory",
    version: "1.0.0",
    darkDefault: false,
    semantic: semantic("light"),
    modes: { light: { semantic: semantic("light") }, dark: { semantic: semantic("dark") } },
    recipe: {
      buttonDefault: "solid",
      density: "comfortable",
      radii: {
        button: tokenValue("--radius-button"),
        card: tokenValue("--radius-card"),
        badge: tokenValue("--radius-md"),
        input: tokenValue("--radius-md"),
        pill: tokenValue("--radius-full"),
      },
      elevationTokens: { card: tokenValue("--elevation-sm") },
    },
    typography: {
      fontSans: tokenValue("--font-sans"),
      fontMono: tokenValue("--font-mono"),
      fontDisplay: tokenValue("--font-heading"),
    },
  });
}

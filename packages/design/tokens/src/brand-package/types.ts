/**
 * Brand Package — Create Center carrier contract.
 *
 * This is a *host* for third-party design languages (Linear, GSAP, Raycast, Vercel…),
 * not a list of brand presets. Presets only demonstrate the contract.
 *
 * Layers:
 *   1. roles     — color meaning (action vs brand-mark vs surface…)
 *   2. recipe    — control language (button/badge fill, radii slots, free elev CSS)
 *   3. typography / zones / fonts
 *   4. semantic  — shadcn/Tailwind bridge (derived from roles; components keep using --primary)
 *
 * @see packages/design/ARCHITECTURE.md
 */

/** HSL channel triple without `hsl()` wrapper, e.g. "66 89% 54%" */
export type HslChannels = string;

/** Full CSS color (hex / rgb / hsl / oklch / gradient) */
export type CssColor = string;

export type ButtonDefaultStyle = "solid" | "outline" | "gradient-stroke";

/**
 * Elevation *presets* are only shortcuts that expand to free CSS box-shadow tokens.
 * Carriers should prefer `recipe.elevationTokens` with arbitrary shadow stacks.
 */
export type ElevationStyle = "none" | "soft" | "raised" | "key" | "hairline";

export type Density = "compact" | "comfortable" | "spacious";

/** Badge fill language (may diverge from action CTA) */
export type BadgeDefaultStyle = "match-action" | "match-primary" | "muted" | "outline" | "brand";

export type BrandZoneId = "product" | "marketing";

/**
 * First-class color roles — what Create Center fills.
 * Maps onto CSS vars and into shadcn semantic for component compatibility.
 */
export interface BrandColorRoles {
  /** Page canvas */
  canvas: HslChannels;
  canvasForeground: HslChannels;
  /** Contained surfaces (cards, panels) */
  surface: HslChannels;
  surfaceForeground: HslChannels;
  /**
   * Product *action* fill (default Button / primary chrome).
   * Must be readable as a CTA — not necessarily the brand mark color.
   */
  action: HslChannels;
  actionForeground: HslChannels;
  /**
   * Brand mark only (logo accent, AI diamond, VI-adjacent product accent).
   * NEVER used for default form CTAs unless Create Center explicitly maps action ← brand.
   */
  brand?: HslChannels;
  brandForeground?: HslChannels;
  /** Quiet fills (secondary, badges muted) */
  quiet: HslChannels;
  quietForeground: HslChannels;
  muted: HslChannels;
  mutedForeground: HslChannels;
  border: HslChannels;
  input: HslChannels;
  ring: HslChannels;
  destructive: HslChannels;
  destructiveForeground: HslChannels;
  success?: HslChannels;
  successForeground?: HslChannels;
  warning?: HslChannels;
  warningForeground?: HslChannels;
  info?: HslChannels;
  infoForeground?: HslChannels;
}

/** Shape slots — components bind per role, not one global radius */
export interface BrandRadii {
  button: string;
  card: string;
  badge?: string;
  input?: string;
  pill?: string;
}

/**
 * Free-form elevation — any CSS box-shadow string the brand requires.
 * Components only read --elevation-card / control / raised.
 */
export interface BrandElevationTokens {
  card: string;
  control?: string;
  raised?: string;
}

/**
 * shadcn/Tailwind bridge. Prefer editing `roles`; semantic is kept in sync by normalize().
 * Components continue to use bg-primary etc. which map to action.
 */
export interface BrandSemanticColors {
  background: HslChannels;
  foreground: HslChannels;
  card: HslChannels;
  cardForeground: HslChannels;
  popover: HslChannels;
  popoverForeground: HslChannels;
  /** = roles.action (product CTA) */
  primary: HslChannels;
  primaryForeground: HslChannels;
  secondary: HslChannels;
  secondaryForeground: HslChannels;
  muted: HslChannels;
  mutedForeground: HslChannels;
  accent: HslChannels;
  accentForeground: HslChannels;
  destructive: HslChannels;
  destructiveForeground: HslChannels;
  border: HslChannels;
  input: HslChannels;
  ring: HslChannels;
  success?: HslChannels;
  successForeground?: HslChannels;
  warning?: HslChannels;
  warningForeground?: HslChannels;
  info?: HslChannels;
  infoForeground?: HslChannels;
}

export interface BrandRecipe {
  buttonDefault: ButtonDefaultStyle;
  density: Density;
  /**
   * Preferred: free radii slots.
   * Legacy: buttonRadius / cardRadius still accepted and normalized into radii.
   */
  radii?: BrandRadii;
  /** Preferred: free CSS shadow stacks */
  elevationTokens?: BrandElevationTokens;
  /**
   * Legacy shortcut — expanded to elevationTokens by normalize().
   * @deprecated prefer elevationTokens
   */
  elevation?: ElevationStyle;
  primaryStrokeGradient?: string;
  outlineBorder?: CssColor;
  badgeDefault?: BadgeDefaultStyle;
  /** @deprecated use radii.button */
  buttonRadius?: string;
  /** @deprecated use radii.card */
  cardRadius?: string;
  /** @deprecated use radii.badge */
  badgeRadius?: string;
  /** @deprecated use radii.input */
  inputRadius?: string;
  /**
   * @deprecated use elevationTokens.card
   * Custom card shadow when elevation preset is key/hairline
   */
  cardShadow?: string;
}

export interface BrandFontSource {
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype" | "svg";
}

export interface BrandFontFace {
  family: string;
  src: BrandFontSource[];
  weight?: number | string;
  style?: "normal" | "italic" | "oblique";
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  unicodeRange?: string;
}

export interface BrandTypeStep {
  fontSize: string;
  lineHeight?: string | number;
  letterSpacing?: string;
  fontWeight?: string | number;
}

export interface BrandZoneTypography {
  caption?: BrandTypeStep;
  bodySm?: BrandTypeStep;
  body?: BrandTypeStep;
  bodyLg?: BrandTypeStep;
  subheading?: BrandTypeStep;
  headingSm?: BrandTypeStep;
  heading?: BrandTypeStep;
  headingLg?: BrandTypeStep;
  display?: BrandTypeStep;
}

export interface BrandZones {
  /** App shell — never inherits marketing display sizes */
  product?: BrandZoneTypography;
  /** Landing / hero — large display allowed */
  marketing?: BrandZoneTypography;
}

export interface BrandTypography {
  fontSans: string;
  fontMono?: string;
  fontDisplay?: string;
  headingWeight?: number | string;
  faces?: BrandFontFace[];
}

export interface BrandExtensions {
  /** Taxonomy / category accents (GSAP disciplines, etc.) — product chrome may ignore */
  categories?: Record<string, CssColor>;
  /** Marketing-only decorative gradients (spectrum, hero floor) — never product CTA */
  decorative?: Record<string, string>;
  /** @deprecated prefer zones.marketing.display */
  displaySizePx?: number;
  sourceUrl?: string;
  notes?: string[];
}

export interface BrandPackage {
  id: string;
  name: string;
  darkDefault: boolean;
  version: string;
  /**
   * Canonical color roles (Create Center source of truth).
   * If omitted, derived from semantic on normalize().
   */
  roles?: BrandColorRoles;
  /**
   * shadcn bridge — always present after normalize(); derived from roles when possible.
   */
  semantic: BrandSemanticColors;
  recipe: BrandRecipe;
  typography: BrandTypography;
  zones?: BrandZones;
  extensions?: BrandExtensions;
}

export interface CompileResult {
  brand: BrandPackage;
  css: string;
  warnings: string[];
}

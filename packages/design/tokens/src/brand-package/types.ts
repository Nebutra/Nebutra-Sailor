/**
 * Brand Package — Create Center runtime contract.
 *
 * Includes: semantic colors, control recipe, font faces, product/marketing zones.
 * @see packages/design/ARCHITECTURE.md
 */

/** HSL channel triple without `hsl()` wrapper, e.g. "66 89% 54%" */
export type HslChannels = string;

/** Full CSS color (hex / rgb / hsl / oklch / gradient) */
export type CssColor = string;

export type ButtonDefaultStyle = "solid" | "outline" | "gradient-stroke";

export type ElevationStyle = "none" | "soft" | "raised";

export type Density = "compact" | "comfortable" | "spacious";

export type BrandZoneId = "product" | "marketing";

export interface BrandSemanticColors {
  background: HslChannels;
  foreground: HslChannels;
  card: HslChannels;
  cardForeground: HslChannels;
  popover: HslChannels;
  popoverForeground: HslChannels;
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
  buttonRadius: string;
  cardRadius: string;
  elevation: ElevationStyle;
  density: Density;
  primaryStrokeGradient?: string;
  outlineBorder?: CssColor;
}

/** One @font-face source shipped with the brand (Create Center asset URL or data URL). */
export interface BrandFontSource {
  /** Absolute URL, path, or data: URL */
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype" | "svg";
}

export interface BrandFontFace {
  family: string;
  src: BrandFontSource[];
  /** CSS font-weight, e.g. 400 | "400" | "100 900" */
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

/** Type scale for one layout zone (product shell vs marketing narrative). */
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
  /** App shell, forms, tables — safe density */
  product?: BrandZoneTypography;
  /** Landing / hero — large display allowed */
  marketing?: BrandZoneTypography;
}

export interface BrandTypography {
  fontSans: string;
  fontMono?: string;
  fontDisplay?: string;
  headingWeight?: number | string;
  /** @font-face assets to inject with the skin */
  faces?: BrandFontFace[];
}

export interface BrandExtensions {
  categories?: Record<string, CssColor>;
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
  semantic: BrandSemanticColors;
  recipe: BrandRecipe;
  typography: BrandTypography;
  /** Product vs marketing type scales */
  zones?: BrandZones;
  extensions?: BrandExtensions;
}

export interface CompileResult {
  brand: BrandPackage;
  css: string;
  warnings: string[];
}

/**
 * Typography Module
 *
 * Centralized typography system for the design system.
 *
 * @example
 * ```tsx
 * import {
 *   fontFamilies,
 *   fontSizes,
 *   typeStyles,
 *   getGoogleFontsUrl,
 * } from "@nebutra/ui/typography";
 *
 * // Use font family
 * const style = { fontFamily: fontFamilies.primary };
 *
 * // Use type preset
 * const headingStyle = typeStyles.h1;
 *
 * // Get Google Fonts URL
 * const fontsUrl = getGoogleFontsUrl(["inter", "jetbrainsMono"]);
 * ```
 */

// Font configuration and loading
export {
  allFonts,
  // Loading utilities
  areFontsLoaded,
  cjkFonts,
  defaultFonts,
  type FontConfig,
  fontFeatureSettings,
  fontLicenseNotice,
  // CSS helpers
  fontSmoothing,
  // Font configs
  fonts,
  // License info
  getFontLicenses,
  getFontPreloadLinks,
  getGoogleFontsLink,
  // URL builders
  getGoogleFontsUrl,
  waitForFonts,
} from "./fonts";
// Tokens - Font families, sizes, weights, etc.
export {
  FONT_FAMILY_CJK,
  FONT_FAMILY_HEADING,
  FONT_FAMILY_MONO,
  // Font families
  FONT_FAMILY_PRIMARY,
  // Types
  type FontFamily,
  type FontSize,
  type FontWeight,
  // Fluid typography
  fluidFontSizes,
  fontFamilies,
  // Type scale
  fontSizes,
  fontSizesPx,
  // Font weights
  fontWeights,
  type LetterSpacing,
  type LineHeight,
  // Letter spacing
  letterSpacing,
  // Line heights
  lineHeights,
  type TypeStyle,
  // Combined type styles
  typeStyles,
} from "./tokens";

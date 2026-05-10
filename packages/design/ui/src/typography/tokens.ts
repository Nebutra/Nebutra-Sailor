/**
 * Typography Tokens
 *
 * Centralized typography configuration for the entire design system.
 * All font-related values should come from here.
 */

// ============================================
// Font Families
// ============================================

/**
 * Primary font stack - Used for body text and UI
 *
 * Poppins is the primary font for English text. vivo Sans is for Chinese.
 * Falls back through system fonts for maximum compatibility.
 */
export const FONT_FAMILY_PRIMARY =
  '"Poppins", "vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Heading font stack - Used for titles and emphasis
 *
 * Geist Sans is the primary display typeface.
 */
export const FONT_FAMILY_HEADING =
  '"Geist", "Poppins", "vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Monospace font stack - Used for code and technical content
 */
export const FONT_FAMILY_MONO =
  '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * CJK (Chinese/Japanese/Korean) fallback stack
 *
 * vivo Sans is the primary Chinese font.
 * Provides consistent rendering for Chinese, Japanese, and Korean text.
 */
export const FONT_FAMILY_CJK =
  '"vivo Sans", "Source Han Sans SC", "Source Han Sans", "Noto Sans CJK SC", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

/**
 * Complete font stacks with CJK fallback
 */
export const fontFamilies = {
  /** Primary UI and body text */
  primary: FONT_FAMILY_PRIMARY,

  /** Headings and titles */
  heading: FONT_FAMILY_HEADING,

  /** Code and monospace */
  mono: FONT_FAMILY_MONO,

  /** CJK-specific fallback */
  cjk: FONT_FAMILY_CJK,

  /** Primary with CJK fallback for multilingual content */
  primaryCJK: `${FONT_FAMILY_PRIMARY}, ${FONT_FAMILY_CJK}`,

  /** System font stack (fast fallback, no web fonts) */
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

// ============================================
// Type Scale
// ============================================

/**
 * Font size scale using rem units for accessibility
 *
 * Base: 16px = 1rem
 * Each step follows a modular scale (~1.25 ratio)
 */
export const fontSizes = {
  /** 12px - Micro text, badges */
  xs: "0.75rem",

  /** 14px - Small text, captions, labels */
  sm: "0.875rem",

  /** 16px - Base body text */
  base: "1rem",

  /** 18px - Lead text, larger body */
  lg: "1.125rem",

  /** 20px - Small headings, subtitles */
  xl: "1.25rem",

  /** 24px - H4 equivalent */
  "2xl": "1.5rem",

  /** 30px - H3 equivalent */
  "3xl": "1.875rem",

  /** 36px - H2 equivalent */
  "4xl": "2.25rem",

  /** 48px - H1 equivalent */
  "5xl": "3rem",

  /** 60px - Display/Hero text */
  "6xl": "3.75rem",

  /** 72px - Large display */
  "7xl": "4.5rem",

  /** 96px - Extra large display */
  "8xl": "6rem",
} as const;

/**
 * Font size in pixels (for cases where rem isn't suitable)
 */
export const fontSizesPx = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  "7xl": 72,
  "8xl": 96,
} as const;

// ============================================
// Line Heights
// ============================================

/**
 * Line height scale
 *
 * Using unitless values for better inheritance.
 */
export const lineHeights = {
  /** 1 - Single line, icons */
  none: 1,

  /** 1.25 - Tight, for large headings */
  tight: 1.25,

  /** 1.375 - Slightly snug */
  snug: 1.375,

  /** 1.5 - Normal body text */
  normal: 1.5,

  /** 1.625 - Relaxed reading */
  relaxed: 1.625,

  /** 1.75 - Loose, for small text */
  loose: 1.75,

  /** 2 - Double spaced */
  double: 2,
} as const;

// ============================================
// Font Weights
// ============================================

/**
 * Font weight scale
 *
 * Inter and Public Sans support all these weights.
 * Variable fonts can use any value 100-900.
 */
export const fontWeights = {
  /** 100 - Thin (if available) */
  thin: 100,

  /** 200 - Extra light */
  extralight: 200,

  /** 300 - Light */
  light: 300,

  /** 400 - Regular/Normal */
  normal: 400,

  /** 500 - Medium */
  medium: 500,

  /** 600 - Semibold */
  semibold: 600,

  /** 700 - Bold */
  bold: 700,

  /** 800 - Extra bold */
  extrabold: 800,

  /** 900 - Black */
  black: 900,
} as const;

// ============================================
// Letter Spacing (Tracking)
// ============================================

/**
 * Letter spacing scale
 *
 * Negative values for tight headlines, positive for small caps.
 */
export const letterSpacing = {
  /** -0.05em - Very tight, large display only */
  tighter: "-0.05em",

  /** -0.025em - Slightly tight, headings */
  tight: "-0.025em",

  /** 0 - Normal */
  normal: "0",

  /** 0.025em - Slightly wide */
  wide: "0.025em",

  /** 0.05em - Wide, for small caps */
  wider: "0.05em",

  /** 0.1em - Very wide, all caps */
  widest: "0.1em",
} as const;

// ============================================
// Combined Type Styles
// ============================================

/**
 * Pre-defined typography presets
 *
 * These combine font-family, size, weight, and line-height
 * for common use cases.
 */
export const typeStyles = {
  /** Hero/Display - Large marketing headlines */
  display: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["6xl"],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },

  /** H1 - Page titles */
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["5xl"],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },

  /** H2 - Section titles */
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["4xl"],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },

  /** H3 - Subsection titles */
  h3: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["3xl"],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  },

  /** H4 - Card titles, small sections */
  h4: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  },

  /** H5 - Widget titles */
  h5: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  /** H6 - Smallest heading */
  h6: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  /** Body - Default paragraph text */
  body: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  /** Body Large - Lead paragraphs */
  bodyLarge: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
  },

  /** Body Small - Secondary text */
  bodySmall: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  /** Caption - Image captions, timestamps */
  caption: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
  },

  /** Label - Form labels, UI labels */
  label: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },

  /** Button - Button text */
  button: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  },

  /** Code - Inline code */
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  /** Code Block - Code blocks */
  codeBlock: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
  },

  /** Overline - Small caps labels */
  overline: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.widest,
    textTransform: "uppercase" as const,
  },
} as const;

export type TypeStyle = keyof typeof typeStyles;

// ============================================
// Responsive Typography
// ============================================

/**
 * Fluid typography clamp values
 *
 * Format: clamp(min, preferred, max)
 * Uses viewport width for smooth scaling.
 */
export const fluidFontSizes = {
  /** Display: 36px to 72px */
  display: "clamp(2.25rem, 5vw + 1rem, 4.5rem)",

  /** H1: 30px to 48px */
  h1: "clamp(1.875rem, 4vw + 0.5rem, 3rem)",

  /** H2: 24px to 36px */
  h2: "clamp(1.5rem, 3vw + 0.5rem, 2.25rem)",

  /** H3: 20px to 30px */
  h3: "clamp(1.25rem, 2vw + 0.5rem, 1.875rem)",

  /** Body: 14px to 18px */
  body: "clamp(0.875rem, 1vw + 0.5rem, 1.125rem)",
} as const;

// ============================================
// Type Exports
// ============================================

export type FontFamily = keyof typeof fontFamilies;
export type FontSize = keyof typeof fontSizes;
export type LineHeight = keyof typeof lineHeights;
export type FontWeight = keyof typeof fontWeights;
export type LetterSpacing = keyof typeof letterSpacing;

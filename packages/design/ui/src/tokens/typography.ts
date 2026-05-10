/**
 * Typography Token System
 *
 * Defines font sizes, weights, and semantic text styles.
 *
 * @see apps/landing-page/DESIGN.md Section 10.7
 */

export const fontSizes = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem", // 36px
  "5xl": "3rem", // 48px
  "6xl": "3.75rem", // 60px
  "7xl": "4.5rem", // 72px - Hero only
} as const;

export const fontWeights = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeights = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
} as const;

/**
 * Semantic text styles — legacy aliases (kept for backward compat)
 * Prefer the named scale below for new code.
 */
export const textStyles = {
  // Display styles (Hero headlines)
  "display-1": "text-5xl md:text-6xl lg:text-7xl font-bold leading-tight",
  "display-2": "text-4xl md:text-5xl font-bold leading-tight",

  // Heading styles
  "heading-1": "text-3xl md:text-4xl font-bold leading-tight",
  "heading-2": "text-2xl md:text-3xl font-semibold leading-snug",
  "heading-3": "text-xl md:text-2xl font-semibold leading-snug",
  "heading-4": "text-lg md:text-xl font-semibold leading-normal",

  // Body styles
  "body-lg": "text-lg leading-relaxed",
  body: "text-base leading-relaxed",
  "body-sm": "text-sm leading-normal",

  // Utility styles
  caption: "text-xs font-medium leading-normal",
  code: "font-mono text-sm leading-relaxed",
  label: "text-sm font-medium leading-normal",
} as const;

/**
 * Named Typography Scale — Geist-style
 *
 * Each entry corresponds to a @utility class in globals.css.
 * Use these as className values directly — no component wrapper needed.
 *
 * Heading:  text-heading-{72|64|56|48|40|32|24|20|16|14}
 * Button:   text-button-{16|14|12}
 * Label:    text-label-{20|18|16|14|13|12}
 *           text-label-{size}-strong / -mono / -tabular
 * Copy:     text-copy-{24|20|18|16|14|13}
 *           text-copy-{size}-strong / -mono
 */
export const headingScale = [72, 64, 56, 48, 40, 32, 24, 20, 16, 14] as const;
export const buttonScale = [16, 14, 12] as const;
export const labelScale = [20, 18, 16, 14, 13, 12] as const;
export const copyScale = [24, 20, 18, 16, 14, 13] as const;

export type HeadingSize = (typeof headingScale)[number];
export type ButtonSize = (typeof buttonScale)[number];
export type LabelSize = (typeof labelScale)[number];
export type CopySize = (typeof copyScale)[number];
export type LabelVariant = "strong" | "mono" | "tabular";
export type CopyVariant = "strong" | "mono";

/**
 * Text color presets
 */
export const textColors = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  subtle: "text-muted-foreground/80",
  accent: "text-[var(--brand-accent)]",
  gradient: "bg-[image:var(--brand-gradient)] bg-clip-text text-transparent",
} as const;

export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontWeights;
export type LineHeight = keyof typeof lineHeights;
export type TextStyle = keyof typeof textStyles;
export type TextColor = keyof typeof textColors;

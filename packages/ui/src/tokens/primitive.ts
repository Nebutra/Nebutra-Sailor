/**
 * Primitive Design Tokens — Layer 1
 *
 * Raw values only. No CSS variable references, no semantic meaning.
 * These are the "atoms" of the design system.
 *
 * Color source: 云毓智能 VI 手册 (packages/brand/assets/vi/full.md)
 * Typography:   VI §Typography — Poppins (EN), vivo Sans (CN)
 */

import { colors } from "@nebutra/brand";

// ─── Color Palette ────────────────────────────────────────────────────────────

export const primitiveColors = {
  // Nebutra Blue (云毓蓝) — technology & trust — VI: #0033FE
  blue50: colors.primary[50],
  blue100: colors.primary[100],
  blue200: colors.primary[200],
  blue300: colors.primary[300],
  blue400: colors.primary[400],
  blue500: colors.primary[500], // brand primary
  blue600: colors.primary[600],
  blue700: colors.primary[700],
  blue800: colors.primary[800],
  blue900: colors.primary[900],
  blue950: colors.primary[950],

  // Nebutra Cyan (云毓青) — data flow & intelligence — VI: #0BF1C3
  cyan50: colors.accent[50],
  cyan100: colors.accent[100],
  cyan200: colors.accent[200],
  cyan300: colors.accent[300],
  cyan400: colors.accent[400],
  cyan500: colors.accent[500], // brand secondary
  cyan600: colors.accent[600],
  cyan700: colors.accent[700],
  cyan800: colors.accent[800],
  cyan900: colors.accent[900],
  cyan950: colors.accent[950],

  // Neutral (blue-undertone gray scale)
  neutral50: colors.neutral[50],
  neutral100: colors.neutral[100],
  neutral200: colors.neutral[200],
  neutral300: colors.neutral[300],
  neutral400: colors.neutral[400],
  neutral500: colors.neutral[500],
  neutral600: colors.neutral[600],
  neutral700: colors.neutral[700],
  neutral800: colors.neutral[800],
  neutral900: colors.neutral[900],
  neutral950: colors.neutral[950], // deepest — used as dark background

  // Semantic raw colors — VI §Color Specifications
  // NOTE: info = brand blue (#0033FE), not sky/teal
  red500: "#ef4444",
  red600: "#dc2626",
  green500: "#22c55e", // VI manual specifies this exact value for success
  green600: "#16a34a",
  amber500: "#f59e0b",
  amber600: "#d97706",

  white: colors.white,
  black: colors.black,
} as const;

export type PrimitiveColor = keyof typeof primitiveColors;

// ─── Brand Gradients — VI §Brand Gradients (first-class design assets) ────────

export const primitiveGradients = {
  /** Hero sections, primary CTA buttons, logo fills — VI signature gradient */
  primary: colors.gradient.primary,
  /** Hover states, secondary gradient elements */
  reverse: colors.gradient.primaryReverse,
  /** Vertical layout dividers, page section separators */
  vertical: colors.gradient.primaryVertical,
  /** Background halos, focus glow effects, radial emphasis */
  radial: colors.gradient.primaryRadial,
  /** Dark mode card surfaces — deep brand-blue tinted */
  darkCard: "linear-gradient(135deg, #020617 0%, #0a1628 100%)",
} as const;

export type PrimitiveGradient = keyof typeof primitiveGradients;

// ─── Spacing Scale (px values) ────────────────────────────────────────────────

export const primitiveSpacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type PrimitiveSpacing = keyof typeof primitiveSpacing;

// ─── Layout Containers (px) — max-width standards ────────────────────────────
// Use `text` for text-heavy sections (hero copy, CTA), `content` for general
// sections, and `wide` for full-bleed feature bento grids.

export const primitiveContainer = {
  /** Text-focused: hero headlines, CTA copy, FAQ — optimized for reading */
  text: 896, // ~56rem / max-w-4xl
  /** Standard content sections: pricing, architecture, blog */
  content: 1152, // ~72rem / max-w-6xl
  /** Wide sections: feature bento, testimonials, product demos */
  wide: 1400, // ~87.5rem — Vercel/Supabase standard
} as const;

export type PrimitiveContainer = keyof typeof primitiveContainer;

// ─── Sizing Scale — component heights (px) ────────────────────────────────────

export const primitiveSizing = {
  xs: 20,
  /** Geist button-specific size (24px). Larger than xs by design. */
  tiny: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
  "2xl": 80,
} as const;

export type PrimitiveSizing = keyof typeof primitiveSizing;

// ─── Border Radius (px) ───────────────────────────────────────────────────────

export const primitiveRadius = {
  none: 0,
  sm: 4,
  md: 6, // Geist default — slightly more rounded than 4px
  lg: 8,
  xl: 12,
  "2xl": 16,
  full: 9999,
} as const;

export type PrimitiveRadius = keyof typeof primitiveRadius;

// ─── Font Sizes (px) ──────────────────────────────────────────────────────────

export const primitiveFontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export type PrimitiveFontSize = keyof typeof primitiveFontSize;

// ─── Font Weights ─────────────────────────────────────────────────────────────

export const primitiveFontWeight = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type PrimitiveFontWeight = keyof typeof primitiveFontWeight;

// ─── Font Families — VI §Typography ──────────────────────────────────────────
// EN primary: Poppins (Regular 400 / Medium 500 / SemiBold 600)
// CN primary: vivo Sans → PingFang SC → Microsoft YaHei → Noto Sans SC

export const primitiveFontFamily = {
  /** English body/UI — Poppins per VI manual */
  sans: '"Poppins", "vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
  /** Chinese body/UI — vivo Sans per VI manual */
  cnSans: '"vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  /** Display / hero headlines — pure Poppins per VI manual */
  display: '"Poppins", sans-serif',
  /** Code / monospace */
  mono: '"JetBrains Mono", "Fira Code", ui-monospace, Consolas, monospace',
} as const;

export type PrimitiveFontFamily = keyof typeof primitiveFontFamily;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const primitiveShadow = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  /** Brand glow — blue tone for focus/highlight states */
  brandGlow: "0 0 0 3px rgb(0 51 254 / 0.15)",
} as const;

export type PrimitiveShadow = keyof typeof primitiveShadow;

// ─── Transition ───────────────────────────────────────────────────────────────

export const primitiveTransition = {
  duration: {
    fast: 150, // ms — hover, focus, small state changes
    normal: 200, // ms — standard transitions
    slow: 300, // ms — larger motion (accordion, modal)
  },
  easing: {
    default: "ease-out",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// ─── Focus Ring ───────────────────────────────────────────────────────────────

export const primitiveFocusRing = {
  width: 2, // px
  offset: 2, // px — gap between element and ring
} as const;

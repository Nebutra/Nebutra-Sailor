/**
 * @nebutra/ui — Tailwind CSS 4 Preset
 *
 * Consumes primitive design tokens from tokens/primitive.ts, which itself
 * sources values from @nebutra/brand → @nebutra/design-tokens (SSOT).
 *
 * Usage (Tailwind CSS 4, CSS import):
 *   @source "@nebutra/ui/styles/globals.css"
 *
 * Usage (legacy tailwind.config.js):
 *   import { nebutraPreset } from "@nebutra/ui/tailwind.preset"
 *   export default { presets: [nebutraPreset] }
 */

import {
  primitiveColors,
  primitiveFontFamily,
  primitiveFontSize,
  primitiveFontWeight,
  primitiveGradients,
  primitiveRadius,
  primitiveShadow,
} from "./tokens/primitive";

// ─── Brand Color Palette ──────────────────────────────────────────────────────
// Source: 云毓智能 VI 手册 — these are the correct Nebutra values, NOT generic
// blue (#3B82F6) or purple (#A855F7) which were incorrectly present before.

export const nebutraColors = {
  // 云毓蓝 (Nebutra Blue) — primary brand color — VI: #0033FE
  blue: {
    50: primitiveColors.blue50,
    100: primitiveColors.blue100,
    200: primitiveColors.blue200,
    300: primitiveColors.blue300,
    400: primitiveColors.blue400,
    500: primitiveColors.blue500,
    600: primitiveColors.blue600,
    700: primitiveColors.blue700,
    800: primitiveColors.blue800,
    900: primitiveColors.blue900,
    950: primitiveColors.blue950,
    DEFAULT: primitiveColors.blue500,
    foreground: primitiveColors.white,
  },

  // 云毓青 (Nebutra Cyan) — secondary brand color — VI: #0BF1C3
  cyan: {
    50: primitiveColors.cyan50,
    100: primitiveColors.cyan100,
    200: primitiveColors.cyan200,
    300: primitiveColors.cyan300,
    400: primitiveColors.cyan400,
    500: primitiveColors.cyan500,
    600: primitiveColors.cyan600,
    700: primitiveColors.cyan700,
    800: primitiveColors.cyan800,
    900: primitiveColors.cyan900,
    950: primitiveColors.cyan950,
    DEFAULT: primitiveColors.cyan500,
    foreground: primitiveColors.neutral900,
  },

  // Neutral (blue-undertone gray scale)
  neutral: {
    50: primitiveColors.neutral50,
    100: primitiveColors.neutral100,
    200: primitiveColors.neutral200,
    300: primitiveColors.neutral300,
    400: primitiveColors.neutral400,
    500: primitiveColors.neutral500,
    600: primitiveColors.neutral600,
    700: primitiveColors.neutral700,
    800: primitiveColors.neutral800,
    900: primitiveColors.neutral900,
    950: primitiveColors.neutral950,
  },

  // Semantic colors — VI §Color Specifications
  success: primitiveColors.green500, // #22c55e — VI specifies this exact value
  warning: primitiveColors.amber500, // #f59e0b
  error: primitiveColors.red500, // #ef4444
  info: primitiveColors.blue500, // #0033FE — VI: Info = Brand Blue
} as const;

// ─── Brand Gradients ──────────────────────────────────────────────────────────
// VI §Brand Gradients — these are first-class brand assets

export const nebutraGradients = {
  brand: primitiveGradients.primary,
  brandHover: primitiveGradients.reverse,
  section: primitiveGradients.vertical,
  glow: primitiveGradients.radial,
  darkCard: primitiveGradients.darkCard,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const nebutraSpacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
// Consumed directly from primitive tokens (px → rem conversion)

export const nebutraBorderRadius = {
  none: "0",
  sm: `${primitiveRadius.sm / 16}rem`, // 4px → 0.25rem
  md: `${primitiveRadius.md / 16}rem`, // 6px → 0.375rem
  lg: `${primitiveRadius.lg / 16}rem`, // 8px → 0.5rem
  xl: `${primitiveRadius.xl / 16}rem`, // 12px → 0.75rem
  "2xl": `${primitiveRadius["2xl"] / 16}rem`, // 16px → 1rem
  full: "9999px",
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const nebutraShadows = {
  none: primitiveShadow.none,
  sm: primitiveShadow.sm,
  md: primitiveShadow.md,
  lg: primitiveShadow.lg,
  xl: primitiveShadow.xl,
  brandGlow: primitiveShadow.brandGlow,
} as const;

// ─── Typography — VI §Typography ─────────────────────────────────────────────

export const nebutraTypography = {
  fontFamily: {
    sans: primitiveFontFamily.sans,
    cn: primitiveFontFamily.cnSans,
    display: primitiveFontFamily.display,
    mono: primitiveFontFamily.mono,
  },
  fontSize: {
    xs: `${primitiveFontSize.xs / 16}rem`, // 12px
    sm: `${primitiveFontSize.sm / 16}rem`, // 14px
    base: `${primitiveFontSize.base / 16}rem`, // 16px
    lg: `${primitiveFontSize.lg / 16}rem`, // 18px
    xl: `${primitiveFontSize.xl / 16}rem`, // 20px
    "2xl": `${primitiveFontSize["2xl"] / 16}rem`, // 24px
    "3xl": `${primitiveFontSize["3xl"] / 16}rem`, // 30px
    "4xl": `${primitiveFontSize["4xl"] / 16}rem`, // 36px
  },
  fontWeight: {
    light: String(primitiveFontWeight.light),
    normal: String(primitiveFontWeight.normal),
    medium: String(primitiveFontWeight.medium),
    semibold: String(primitiveFontWeight.semibold),
    bold: String(primitiveFontWeight.bold),
  },
} as const;

// ─── Animations ───────────────────────────────────────────────────────────────

export const nebutraAnimations = {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
  "fade-in": "fade-in 0.15s ease-out",
  "fade-out": "fade-out 0.15s ease-out",
  "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
  "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
  "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
  "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
  spin: "spin 1s linear infinite",
  spinner: "spinner 0.6s linear infinite", // Button loading state
  pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  bounce: "bounce 1s infinite",
} as const;

// ─── Full Preset ──────────────────────────────────────────────────────────────

export const nebutraPreset = {
  colors: nebutraColors,
  spacing: nebutraSpacing,
  borderRadius: nebutraBorderRadius,
  boxShadow: nebutraShadows,
  fontFamily: nebutraTypography.fontFamily,
  fontSize: nebutraTypography.fontSize,
  fontWeight: nebutraTypography.fontWeight,
  animation: nebutraAnimations,
} as const;

export type NebutraPreset = typeof nebutraPreset;

export default nebutraPreset;

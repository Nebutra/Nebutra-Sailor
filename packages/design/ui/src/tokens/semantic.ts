/**
 * Semantic Design Tokens — Layer 2
 *
 * Maps primitive values to semantic meanings with light/dark mode awareness.
 * This file is the bridge between primitive.ts and globals.css.
 *
 * VI rules applied:
 * - Info = Brand Blue (#0033FE), not sky/teal
 * - Light background = pure white (#FFFFFF)
 * - Dark background = neutral-950 (#020617) with blue undertone
 * - Success = #22c55e per VI manual
 */

import {
  primitiveColors,
  primitiveFocusRing,
  primitiveFontFamily,
  primitiveGradients,
  primitiveRadius,
  primitiveTransition,
} from "./primitive";

// ─── Semantic Color Scale Interface ───────────────────────────────────────────

export interface SemanticColorScale {
  readonly background: string;
  readonly foreground: string;
  readonly card: string;
  readonly cardForeground: string;
  readonly popover: string;
  readonly popoverForeground: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly secondary: string;
  readonly secondaryForeground: string;
  readonly muted: string;
  readonly mutedForeground: string;
  readonly accent: string;
  readonly accentForeground: string;
  readonly destructive: string;
  readonly destructiveForeground: string;
  readonly success: string;
  readonly successForeground: string;
  readonly warning: string;
  readonly warningForeground: string;
  readonly info: string;
  readonly infoForeground: string;
  readonly border: string;
  readonly input: string;
  readonly ring: string;
}

// ─── Light Mode Semantic Colors ───────────────────────────────────────────────

export const semanticLight: SemanticColorScale = {
  // VI: White is the canonical light background (not off-white neutral-50)
  background: primitiveColors.white,
  foreground: primitiveColors.neutral900,

  card: primitiveColors.white,
  cardForeground: primitiveColors.neutral900,

  popover: primitiveColors.white,
  popoverForeground: primitiveColors.neutral900,

  // VI: Primary = 云毓蓝 #0033FE
  primary: primitiveColors.blue500,
  primaryForeground: primitiveColors.white,

  // VI: Secondary = 云毓青 #0BF1C3
  secondary: primitiveColors.cyan500,
  secondaryForeground: primitiveColors.neutral900,

  muted: primitiveColors.neutral100,
  mutedForeground: primitiveColors.neutral500,

  accent: primitiveColors.blue50,
  accentForeground: primitiveColors.blue500,

  destructive: primitiveColors.red500,
  destructiveForeground: primitiveColors.white,

  // VI: success = #22c55e (VI manual specifies exact value)
  success: primitiveColors.green500,
  successForeground: primitiveColors.white,

  warning: primitiveColors.amber500,
  warningForeground: primitiveColors.neutral900,

  // VI: Info = Brand Blue — same as primary, not a separate sky color
  info: primitiveColors.blue500,
  infoForeground: primitiveColors.white,

  border: primitiveColors.neutral200,
  input: primitiveColors.neutral200,

  // Focus ring = brand blue — unifies a11y with brand identity
  ring: primitiveColors.blue500,
} as const;

// ─── Dark Mode Semantic Colors ────────────────────────────────────────────────

export const semanticDark: SemanticColorScale = {
  // VI: Dark uses deepest blue-undertone neutral (#020617)
  background: primitiveColors.neutral950,
  foreground: primitiveColors.neutral50,

  // Dark cards get a slight blue lift to feel on-brand, not flat gray
  card: primitiveColors.neutral900,
  cardForeground: primitiveColors.neutral50,

  popover: primitiveColors.neutral900,
  popoverForeground: primitiveColors.neutral50,

  // Slightly lighter blues for readability on dark backgrounds
  primary: primitiveColors.blue400,
  primaryForeground: primitiveColors.neutral950,

  secondary: primitiveColors.cyan400,
  secondaryForeground: primitiveColors.neutral950,

  muted: primitiveColors.neutral800,
  mutedForeground: primitiveColors.neutral400,

  // Deep brand-blue tinted surface (#0a1628)
  accent: "#0a1628",
  accentForeground: primitiveColors.blue400,

  destructive: primitiveColors.red600,
  destructiveForeground: primitiveColors.neutral50,

  success: primitiveColors.green600,
  successForeground: primitiveColors.neutral50,

  warning: primitiveColors.amber600,
  warningForeground: primitiveColors.neutral50,

  // Dark info = lighter brand blue for contrast
  info: primitiveColors.blue400,
  infoForeground: primitiveColors.neutral950,

  border: primitiveColors.neutral800,
  input: primitiveColors.neutral800,
  ring: primitiveColors.blue400,
} as const;

// ─── Gradient Semantic Tokens ─────────────────────────────────────────────────
// VI: The Blue→Cyan gradient is Nebutra's most distinctive visual signature.
// Consumed by Tailwind preset as --gradient-* CSS custom properties.

export const semanticGradients = {
  /** Primary CTA buttons, hero sections, logo accents — VI §Brand Gradients */
  brand: primitiveGradients.primary,
  /** Hover state override for gradient interactive elements */
  brandHover: primitiveGradients.reverse,
  /** Page section dividers, feature highlight strips */
  section: primitiveGradients.vertical,
  /** Background glow effects, focus halos, radial emphasis areas */
  glow: primitiveGradients.radial,
} as const;

export type SemanticGradient = keyof typeof semanticGradients;

// ─── Global Design Refinements ────────────────────────────────────────────────
// Values consumed directly by globals.css and tailwind.preset.ts

export const semanticGlobals = {
  // Border radius — 6px (Geist-matching, more rounded than typical 4px)
  defaultRadius: primitiveRadius.md,

  // Universal transition — applies to all interactive elements
  transitionDuration: primitiveTransition.duration.fast, // 150ms
  transitionEasing: primitiveTransition.easing.default, // ease-out

  // Focus ring — brand blue at 2px width, 2px gap
  focusRingWidth: primitiveFocusRing.width,
  focusRingOffset: primitiveFocusRing.offset,

  // Border color for universal * rule — precise HSL (Geist-matching)
  borderColor: "hsl(240 5.9% 90%)",

  // Typography — VI §Typography
  fontSans: primitiveFontFamily.sans,
  fontCnSans: primitiveFontFamily.cnSans,
  fontDisplay: primitiveFontFamily.display,
  fontMono: primitiveFontFamily.mono,
} as const;

export type SemanticTheme = "light" | "dark";

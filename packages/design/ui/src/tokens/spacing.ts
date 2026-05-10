/**
 * Spacing Token System
 *
 * Based on 4px base unit. All values are in pixels for consistency.
 *
 * @see apps/landing-page/DESIGN.md Section 10.5
 */

export const spacing = {
  // Base scale (4px increments)
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
  32: "128px",
} as const;

/**
 * Semantic spacing aliases for common use cases
 */
export const semanticSpacing = {
  // Card internal spacing
  cardPadding: spacing[6], // 24px
  cardGap: spacing[4], // 16px

  // Section spacing (responsive values as strings for Tailwind)
  sectionYSm: "py-12 md:py-16", // Compact: Trust Ribbon, Stats Break
  sectionYMd: "py-16 md:py-24", // Standard: Most sections
  sectionYLg: "py-24 md:py-32", // Emphasis: Hero, Vision, Final CTA

  // Content gaps
  contentGap: spacing[8], // 32px
  inlineGap: spacing[2], // 8px
  iconGap: spacing[1], // 4px
} as const;

/**
 * Container width tokens
 */
export const containerWidths = {
  narrow: "max-w-3xl", // 768px - FAQ, focused content
  medium: "max-w-5xl", // 1024px - Architecture, Pricing
  wide: "max-w-7xl", // 1280px - Full layouts, Bento
  full: "max-w-full",
} as const;

export type SpacingScale = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type ContainerWidth = keyof typeof containerWidths;

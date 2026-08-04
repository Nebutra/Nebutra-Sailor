/**
 * Spacing Token System
 *
 * Based on 4px base unit. All values are in pixels for consistency.
 *
 * @see apps/landing/DESIGN.md Section 10.5
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
/**
 * Points at the container contract in @nebutra/tokens rather than restating a
 * second scale in Tailwind steps. Before 2026-07-28 these were `max-w-5xl`
 * (1024px) and `max-w-7xl` (1280px), which contradicted the documented
 * contract (text 896 / content 1152 / wide 1400) that every consumer was
 * told to follow.
 */
export const containerWidths = {
  /** Credentials / auth form column — login-card scale, not page-form. */
  authForm: "max-w-[360px]", // login-card — SSOT: AUTH_FORM_COLUMN_CLASS in utils/auth-surfaces
  narrow: "max-w-[var(--container-text)]", // 896px - FAQ, focused reading
  medium: "max-w-[var(--container-content)]", // 1152px - Architecture, Pricing
  wide: "max-w-[var(--container-wide)]", // 1400px - Full layouts, Bento
  full: "max-w-full",
} as const;

export type SpacingScale = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type ContainerWidth = keyof typeof containerWidths;

/**
 * Spacing Primitives
 *
 * Consistent spacing scale based on Primer's 4px base unit.
 */

/**
 * Spacing scale (Primer-compatible)
 * Each step is 4px * n
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 16,
  4: 24,
  5: 32,
  6: 40,
  7: 48,
  8: 64,
  9: 80,
  10: 96,
  11: 112,
  12: 128,
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];

/**
 * Get spacing value in pixels
 */
export function getSpacing(key: SpacingKey): number {
  return spacing[key];
}

/**
 * Convert spacing key to CSS value
 */
export function spacingToCss(key: SpacingKey): string {
  return `${spacing[key]}px`;
}

/**
 * Common spacing patterns
 */
export const spacingPatterns = {
  /** Page padding */
  pagePadding: { px: [3, 4, 5], py: [4, 5] },
  /** Section spacing */
  sectionGap: { gap: [4, 5, 6] },
  /** Card padding */
  cardPadding: { p: [3, 4] },
  /** Compact density */
  compact: { p: 2, gap: 2 },
  /** Normal density */
  normal: { p: 3, gap: 3 },
  /** Spacious density */
  spacious: { p: 4, gap: 4 },
} as const;

/**
 * Density modes for high-information UIs
 */
export type DensityMode = "compact" | "normal" | "spacious";

export function getDensitySpacing(mode: DensityMode) {
  return spacingPatterns[mode];
}

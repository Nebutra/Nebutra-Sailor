/**
 * Badge Component Tokens — Layer 3
 *
 * Static metadata labels with Geist palette variants, compact sizes, and a
 * pill variant for link-like chips. Dot support remains for compatibility;
 * prefer Status Dot for dot-only indicators.
 */

import {
  primitiveFontSize,
  primitiveFontWeight,
  primitiveRadius,
  primitiveSpacing,
} from "../primitive";

export const badgeTokens = {
  fontSize: primitiveFontSize.xs, // 12px
  fontWeight: primitiveFontWeight.medium, // 500

  paddingX: primitiveSpacing[2], // 8px
  paddingY: 2, // px — tight vertical for inline badges

  borderRadius: primitiveRadius.full, // pill shape

  /** Legacy dot indicator size for text-plus-dot badges */
  dotSize: 6, // px
  dotOffset: 4, // gap between dot and label
} as const;

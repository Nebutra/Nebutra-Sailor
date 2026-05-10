/**
 * Badge Component Tokens — Layer 3
 *
 * Semantic color variants: default, secondary, destructive, outline,
 * success, warning, info, dot.
 * Typography: text-xs font-medium universally (Geist-matching).
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

  /** Dot indicator size for the dot variant */
  dotSize: 6, // px
  dotOffset: 4, // gap between dot and label
} as const;

/**
 * Choicebox Component Tokens — Layer 3
 *
 * Card-style selection control matching Geist Choicebox.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const choiceboxTokens = {
  /** Item card sizing */
  item: {
    borderRadius: primitiveRadius.lg, // 8px
    paddingX: primitiveSpacing[4], // 16px
    paddingY: primitiveSpacing[3], // 12px
    gap: primitiveSpacing[1], // 4px between title and description
  },
  /** Group container gap */
  group: {
    gap: primitiveSpacing[3], // 12px between items
  },
  /** Typography */
  title: {
    fontSize: primitiveFontSize.sm, // 14px
    fontWeight: 500,
  },
  description: {
    fontSize: primitiveFontSize.xs, // 12px
  },
  /** Transition */
  transitionDuration: primitiveTransition.duration.fast, // 150ms
} as const;

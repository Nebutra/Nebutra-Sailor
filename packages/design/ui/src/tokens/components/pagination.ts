/**
 * Pagination Component Tokens — Layer 3
 *
 * Sibling-page navigation for docs/blog/onboarding flows. Dataset paging stays
 * in PaginationControl.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const paginationTokens = {
  gap: primitiveSpacing[3],
  minHeight: primitiveSizing["2xl"],
  padding: {
    x: primitiveSpacing[3],
    y: primitiveSpacing[3],
  },
  radius: primitiveRadius.lg,
  iconSize: primitiveFontSize.lg,
  labelSize: primitiveFontSize.xs,
  titleSize: primitiveFontSize.sm,
  titleGap: primitiveSpacing[1],
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;

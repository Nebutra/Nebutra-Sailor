/**
 * ShowMore Component Tokens — Layer 3
 *
 * Progressive disclosure is a list affordance, not a decorative divider.
 * Fixed trigger geometry avoids row-shift when the hidden count changes.
 */

import {
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const showMoreTokens = {
  triggerHeight: primitiveSizing.sm,
  triggerPaddingX: primitiveSpacing[3],
  dividerInset: primitiveSpacing[5],
  gap: primitiveSpacing[2],
  radius: primitiveRadius.full,
  iconSize: primitiveSizing.xs,
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;

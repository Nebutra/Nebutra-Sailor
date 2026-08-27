/**
 * Scroller Component Tokens — Layer 3
 *
 * Native overflow surface for peer-item rails, feeds, snippets, and logs.
 * Carousel and virtualized data sets stay in their dedicated primitives.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveShadow,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const scrollerTokens = {
  radius: primitiveRadius.lg,
  fadeSize: primitiveSpacing[8],
  button: {
    size: primitiveSizing.sm,
    offset: primitiveSpacing[2],
    radius: primitiveRadius.full,
    iconSize: primitiveFontSize.base,
    shadow: primitiveShadow.sm,
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;

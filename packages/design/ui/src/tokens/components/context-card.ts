/**
 * Context Card Component Tokens — Layer 3
 *
 * Compact metadata popover tuned for dense dashboard rows.
 * Components consume these values through local CSS variables, not raw
 * primitive values in class strings.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const contextCardTokens = {
  width: {
    sm: primitiveSizing["2xl"] * 3, // 240px
    md: primitiveSpacing[10] * 8, // 320px
  },
  padding: {
    x: primitiveSpacing[3], // 12px
    y: primitiveSpacing[3], // 12px
  },
  gap: {
    stack: primitiveSpacing[3], // 12px
    section: primitiveSpacing[2], // 8px
    row: primitiveSpacing[1], // 4px
  },
  borderRadius: primitiveRadius.lg, // 8px
  fontSize: {
    body: primitiveFontSize.sm, // 14px
    metadata: primitiveFontSize.xs, // 12px
  },
  motion: {
    openDelay: 150,
    closeDelay: 120,
    duration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.default,
  },
} as const;

export type ContextCardWidth = keyof typeof contextCardTokens.width;

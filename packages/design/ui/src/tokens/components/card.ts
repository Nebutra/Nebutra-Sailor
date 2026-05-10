/**
 * Card Component Tokens — Layer 3
 *
 * Three padding tiers: sm=16px md=24px(default) lg=32px
 * Default shadow is sm; hover lifts to md.
 * Interactive variant adds border highlight on hover.
 */

import { primitiveRadius, primitiveSpacing } from "../primitive";

export const cardTokens = {
  padding: {
    sm: primitiveSpacing[4], // 16px
    md: primitiveSpacing[6], // 24px — default
    lg: primitiveSpacing[8], // 32px
  },
  borderRadius: primitiveRadius.lg, // 8px
  shadow: {
    default: "shadow-sm",
    hover: "shadow-md",
  },
  /** Interactive border — highlighted on hover when interactive=true */
  interactiveBorderOpacity: 0.6,
} as const;

export type CardPadding = keyof typeof cardTokens.padding;

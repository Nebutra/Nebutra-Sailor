/**
 * Avatar Component Tokens — Layer 3
 *
 * Five-step size scale: xs=20px sm=32px md=40px lg=56px xl=80px
 * Fallback chain: image → initials → generic icon
 */

import { primitiveFontSize } from "../primitive";

export const avatarTokens = {
  size: {
    xs: {
      dimension: 20,
      fontSize: 8,
      iconSize: 10,
      ringWidth: 1,
    },
    sm: {
      dimension: 32,
      fontSize: primitiveFontSize.xs, // 12px
      iconSize: 14,
      ringWidth: 2,
    },
    md: {
      dimension: 40,
      fontSize: primitiveFontSize.sm, // 14px
      iconSize: 16,
      ringWidth: 2,
    },
    lg: {
      dimension: 56,
      fontSize: primitiveFontSize.xl, // 20px
      iconSize: 24,
      ringWidth: 2,
    },
    xl: {
      dimension: 80,
      fontSize: 28,
      iconSize: 32,
      ringWidth: 3,
    },
  },
  group: {
    /** Negative margin to create the overlapping stack effect */
    overlapOffset: -8, // px
    /** Size of the "+N more" overflow badge */
    overflowBadge: 20, // px height
  },
} as const;

export type AvatarSize = keyof typeof avatarTokens.size;

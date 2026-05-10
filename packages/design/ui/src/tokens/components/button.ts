/**
 * Button Component Tokens — Layer 3
 *
 * Strict sizing scale: sm=32px md=40px lg=48px (Geist-matching).
 * Primary variant uses brand gradient per VI manual.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
} from "../primitive";

export const buttonTokens = {
  size: {
    tiny: {
      height: primitiveSizing.tiny, // 24px
      paddingX: primitiveSpacing[2], // 8px
      borderRadius: primitiveRadius.sm, // 4px
      fontSize: 11, // Geist tiny — between xs(12) and 10
      iconSize: 12,
    },
    sm: {
      height: primitiveSizing.sm, // 32px
      paddingX: primitiveSpacing[3], // 12px
      borderRadius: primitiveRadius.sm, // 4px
      fontSize: primitiveFontSize.xs, // 12px
      iconSize: 14,
    },
    md: {
      height: primitiveSizing.md, // 40px
      paddingX: primitiveSpacing[4], // 16px
      borderRadius: primitiveRadius.md, // 6px
      fontSize: primitiveFontSize.sm, // 14px
      iconSize: 16,
    },
    lg: {
      height: primitiveSizing.lg, // 48px
      paddingX: primitiveSpacing[5], // 20px
      borderRadius: primitiveRadius.lg, // 8px
      fontSize: primitiveFontSize.base, // 16px
      iconSize: 18,
    },
    icon: {
      height: primitiveSizing.md, // 40px — square
      width: primitiveSizing.md,
      borderRadius: primitiveRadius.md, // 6px
    },
  },
  /** Loading spinner icon sizes match font size */
  spinner: {
    tiny: 12,
    sm: 14,
    md: 16,
    lg: 18,
  },
  /** Transition — fast for snappy interactive feel */
  transitionDuration: 150,
} as const;

export type ButtonSize = keyof typeof buttonTokens.size;

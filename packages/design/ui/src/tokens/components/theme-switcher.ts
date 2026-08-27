/**
 * ThemeSwitcher Component Tokens — Layer 3
 *
 * Canonical Light / System / Dark selector. It is an app-level preference
 * control, not a local visual toy; state belongs to @nebutra/tokens.
 */

import {
  primitiveFocusRing,
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const themeSwitcherSizes = {
  small: {
    controlHeight: primitiveSizing.sm,
    optionMinWidth: 64,
    optionPaddingX: primitiveSpacing[2],
    iconSize: primitiveFontSize.base,
    fontSize: primitiveFontSize.xs,
    gap: primitiveSpacing[1],
    padding: primitiveSpacing[1],
  },
  medium: {
    controlHeight: primitiveSizing.md,
    optionMinWidth: 80,
    optionPaddingX: primitiveSpacing[3],
    iconSize: primitiveFontSize.lg,
    fontSize: primitiveFontSize.sm,
    gap: primitiveSpacing[1],
    padding: primitiveSpacing[1],
  },
} as const;

export type ThemeSwitcherSize = keyof typeof themeSwitcherSizes;

export const themeSwitcherTokens = {
  radius: primitiveRadius.lg,
  optionRadius: primitiveRadius.md,
  labelGap: primitiveSpacing[2],
  focusRingWidth: primitiveFocusRing.width,
  focusRingOffset: primitiveFocusRing.offset,
  motion: {
    duration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.inOut,
  },
} as const;

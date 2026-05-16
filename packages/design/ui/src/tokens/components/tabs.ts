/**
 * Tabs Component Tokens — Layer 3
 *
 * Same-scope view switching for 2–7 sibling panels. Route navigation belongs
 * in menus or side navigation, while boolean settings belong in Switch/Toggle.
 */

import {
  primitiveFocusRing,
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const tabsSizes = {
  xs: {
    height: primitiveSizing.tiny,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[2],
    gap: primitiveSpacing[1],
    triggerGap: primitiveSpacing[1],
    iconSize: primitiveFontSize.sm,
    fontSize: primitiveFontSize.xs,
    minWidth: 56,
  },
  sm: {
    height: primitiveSizing.sm,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[3],
    gap: primitiveSpacing[1],
    triggerGap: primitiveSpacing[1] + primitiveSpacing[1] / 2,
    iconSize: primitiveFontSize.sm,
    fontSize: primitiveFontSize.xs,
    minWidth: 64,
  },
  md: {
    height: primitiveSizing.md,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[3],
    gap: primitiveSpacing[2],
    triggerGap: primitiveSpacing[1] + primitiveSpacing[1] / 2,
    iconSize: primitiveFontSize.base,
    fontSize: primitiveFontSize.sm,
    minWidth: 72,
  },
  lg: {
    height: primitiveSizing.lg,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[4],
    gap: primitiveSpacing[2] + primitiveSpacing[1] / 2,
    triggerGap: primitiveSpacing[2],
    iconSize: primitiveFontSize.lg,
    fontSize: primitiveFontSize.sm,
    minWidth: 88,
  },
} as const;

export type TabsSize = keyof typeof tabsSizes;

export const tabsTokens = {
  radius: primitiveRadius.lg,
  triggerRadius: primitiveRadius.md,
  pillRadius: primitiveRadius.full,
  lineThickness: 2,
  panelGap: primitiveSpacing[3],
  badgeHeight: primitiveSpacing[5],
  badgePaddingX: primitiveSpacing[1] + primitiveSpacing[1] / 2,
  badgeFontSize: primitiveFontSize.xs,
  focusRingWidth: primitiveFocusRing.width,
  focusRingOffset: primitiveFocusRing.offset,
  motion: {
    duration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.inOut,
  },
} as const;

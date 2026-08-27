/**
 * Sheet Component Tokens — Layer 3
 *
 * Contextual edge panel for read-mostly detail views and short forms.
 * Drawer owns mobile bottom-sheet gestures; Dialog owns blocking decisions.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export type SheetSide = "top" | "right" | "bottom" | "left";

export const sheetSides = [
  "top",
  "right",
  "bottom",
  "left",
] as const satisfies readonly SheetSide[];

export const sheetTokens = {
  inset: primitiveSpacing[3],
  sideWidth: primitiveSizing["2xl"] * 6 + primitiveSpacing[8], // 512px
  edgeHeight: primitiveSizing["2xl"] * 4, // 320px
  paddingX: primitiveSpacing[6],
  paddingY: primitiveSpacing[5],
  bodyPaddingY: primitiveSpacing[4],
  gap: primitiveSpacing[4],
  headerGap: primitiveSpacing[1] + 2,
  footerGap: primitiveSpacing[2],
  radius: primitiveRadius["2xl"],
  close: {
    size: primitiveSizing.sm,
    iconSize: primitiveFontSize.base,
    offset: primitiveSpacing[4],
    radius: primitiveRadius.md,
  },
  overlay: {
    background: "hsl(var(--background) / 0.68)",
    blur: "blur(6px)",
  },
  surface: {
    background: "hsl(var(--popover))",
    shadow: "var(--elevation-xl)",
  },
  motion: {
    duration: primitiveTransition.duration.reveal,
    easing: primitiveTransition.easing.inOut,
  },
} as const;

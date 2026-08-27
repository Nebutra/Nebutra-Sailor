/**
 * Split Button Component Tokens — Layer 3
 *
 * Composes the Button and DropdownMenu primitives while keeping the two-button
 * seam visually exact across size variants.
 */

import { primitiveRadius, primitiveSpacing, primitiveTransition } from "../primitive";
import { buttonTokens } from "./button";

export const splitButtonTokens = {
  triggerWidth: {
    tiny: buttonTokens.size.tiny.height,
    sm: buttonTokens.size.sm.height,
    md: buttonTokens.size.md.height,
    lg: buttonTokens.size.lg.height,
  },
  menu: {
    width: 264,
    minWidth: 192,
  },
  item: {
    gap: primitiveSpacing[3],
    paddingX: primitiveSpacing[3],
    paddingY: primitiveSpacing[2],
    descriptionGap: primitiveSpacing[1],
    radius: primitiveRadius.md,
    iconSize: 16,
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;

export type SplitButtonTokenSize = keyof typeof splitButtonTokens.triggerWidth;

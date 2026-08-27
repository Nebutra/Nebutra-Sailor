/**
 * Feedback Component Tokens — Layer 3
 *
 * The feedback widget is compact but stateful. Fixed geometry keeps the trigger,
 * inline bar, and popover panel stable across docs, dashboard, and marketing use.
 */

import {
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const feedbackTokens = {
  width: primitiveSpacing[10] * 8,
  padding: primitiveSpacing[3],
  sideOffset: primitiveSpacing[2],
  triggerHeight: primitiveSizing.lg,
  controlSize: primitiveSizing.sm,
  textareaHeight: primitiveSizing["2xl"] + primitiveSpacing[5],
  gap: {
    stack: primitiveSpacing[3],
    row: primitiveSpacing[2],
  },
  radius: {
    control: primitiveRadius.md,
    panel: primitiveRadius.lg,
  },
  motion: {
    duration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.default,
  },
} as const;

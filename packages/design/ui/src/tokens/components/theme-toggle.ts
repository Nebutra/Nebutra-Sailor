/**
 * ThemeToggle Component Tokens — Layer 3
 *
 * Binary theme toggles are compact toolbar controls. Geometry is fixed so the
 * sun/moon morph never shifts surrounding navigation content.
 */

import type { Transition } from "framer-motion";
import {
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const themeToggleTokens = {
  sizes: {
    sm: {
      control: primitiveSizing.sm,
      icon: primitiveSpacing[4],
      padding: primitiveSpacing[1],
      radius: primitiveRadius.md,
    },
    md: {
      control: primitiveSizing.md,
      icon: primitiveSpacing[5],
      padding: primitiveSpacing[2],
      radius: primitiveRadius.md,
    },
    lg: {
      control: primitiveSizing.lg,
      icon: primitiveSpacing[6],
      padding: primitiveSpacing[3],
      radius: primitiveRadius.lg,
    },
  },
  icon: {
    center: 12,
    sunRadius: 5,
    moonRadius: 9,
    maskRadius: 9,
    strokeWidth: 2,
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
    hoverScale: 1.06,
    tapScale: 0.92,
    morph: { type: "spring", stiffness: 380, damping: 30 } satisfies Transition,
    press: { type: "spring", stiffness: 420, damping: 28 } satisfies Transition,
    instant: { duration: 0 } satisfies Transition,
  },
} as const;

export type ThemeToggleSize = keyof typeof themeToggleTokens.sizes;

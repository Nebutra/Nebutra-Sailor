/**
 * Toggle Component Tokens — Layer 3
 *
 * Boolean setting switch. It consumes semantic status colors only; decorative
 * hue families without semantic ownership should not be added here.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveShadow,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const toggleSizes = ["small", "normal", "large"] as const;
export type ToggleSize = (typeof toggleSizes)[number];

export const toggleColors = [
  "default",
  "blue",
  "cyan",
  "success",
  "warning",
  "error",
  "neutral",
  "green",
  "amber",
  "red",
  "teal",
  "gray",
] as const;
export type ToggleColor = (typeof toggleColors)[number];

type ToggleColorTokens = {
  readonly trackOn: string;
  readonly trackOff: string;
  readonly trackBorder: string;
  readonly thumb: string;
  readonly iconOn: string;
  readonly iconOff: string;
};

const semanticColor = (
  name: "primary" | "success" | "warning" | "destructive",
): ToggleColorTokens => {
  const color = `hsl(var(--${name}))`;

  return {
    trackOn: color,
    trackOff: "var(--neutral-3)",
    trackBorder: `color-mix(in oklch, ${color} 34%, var(--neutral-7))`,
    thumb: "var(--neutral-1)",
    iconOn: color,
    iconOff: "var(--neutral-10)",
  };
};

export const toggleTokens = {
  size: {
    small: {
      trackWidth: 28,
      trackHeight: 14,
      thumbSize: 12,
      thumbTranslate: 14,
      iconSize: 10,
      labelFontSize: primitiveFontSize.xs,
      paddingY: 3,
      gap: primitiveSpacing[2],
    },
    normal: {
      trackWidth: 32,
      trackHeight: 18,
      thumbSize: 16,
      thumbTranslate: 14,
      iconSize: 12,
      labelFontSize: primitiveFontSize.sm,
      paddingY: 3,
      gap: primitiveSpacing[2],
    },
    large: {
      trackWidth: 40,
      trackHeight: 24,
      thumbSize: primitiveSizing.xs + 2,
      thumbTranslate: 16,
      iconSize: 14,
      labelFontSize: primitiveFontSize.sm,
      paddingY: 3,
      gap: primitiveSpacing[3],
    },
  } satisfies Record<ToggleSize, Record<string, number>>,
  radius: primitiveRadius.full,
  thumbShadow: primitiveShadow.sm,
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
  color: {
    default: semanticColor("success"),
    blue: semanticColor("primary"),
    cyan: {
      trackOn: "var(--cyan-9)",
      trackOff: "var(--neutral-3)",
      trackBorder: "color-mix(in oklch, var(--cyan-9) 34%, var(--neutral-7))",
      thumb: "var(--neutral-1)",
      iconOn: "var(--cyan-11)",
      iconOff: "var(--neutral-10)",
    },
    success: semanticColor("success"),
    warning: semanticColor("warning"),
    error: semanticColor("destructive"),
    neutral: {
      trackOn: "var(--neutral-10)",
      trackOff: "var(--neutral-3)",
      trackBorder: "var(--neutral-7)",
      thumb: "var(--neutral-1)",
      iconOn: "var(--neutral-12)",
      iconOff: "var(--neutral-10)",
    },
  } satisfies Record<
    Exclude<ToggleColor, "green" | "amber" | "red" | "teal" | "gray">,
    ToggleColorTokens
  >,
} as const;

export const toggleColorAliases = {
  green: "success",
  amber: "warning",
  red: "error",
  teal: "cyan",
  gray: "neutral",
} as const satisfies Record<
  Extract<ToggleColor, "green" | "amber" | "red" | "teal" | "gray">,
  keyof typeof toggleTokens.color
>;

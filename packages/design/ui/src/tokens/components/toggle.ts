/**
 * Toggle Component Tokens — Layer 3
 *
 * Boolean setting switch. The default is the active design language's action colour
 * (`--primary`), so a switch reads as part of the brand it sits in; the status colours
 * (success, warning, error) stay opt-in for the cases where on means a status. Decorative
 * hue families without semantic ownership should not be added here.
 */

import {
  primitiveFontSize,
  primitiveRadius,
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
  /** Thumb while checked; the track colour decides whether white still reads on it. */
  readonly thumbOn: string;
  readonly iconOn: string;
  readonly iconOff: string;
};

/**
 * The off state is the same in every colour: a filled neutral track and a thumb that
 * both clear WCAG 1.4.11 (3:1) against the surface. Colour only ever means "on", so an
 * off switch never carries a status tint, and the fill (not an outline) draws the shape.
 */
/** The thumb is always white: it sits on a coloured or mid-grey track in both schemes. */
const THUMB = "oklch(1 0 0)";

const offState = {
  trackOff: "var(--neutral-10)",
  trackBorder: "transparent",
  thumb: THUMB,
  thumbOn: THUMB,
  iconOff: "var(--neutral-10)",
} as const;

const semanticColor = (
  name: "primary" | "success" | "warning" | "destructive",
): ToggleColorTokens => {
  const color = `hsl(var(--${name}))`;

  return {
    ...offState,
    trackOn: color,
    iconOn: color,
  };
};

/**
 * The brand track follows `--primary`, which is near-black, white, lime or green depending on
 * the design language, so the on thumb takes `--primary-foreground` rather than a fixed white.
 */
const brandColor = (): ToggleColorTokens => ({
  ...semanticColor("primary"),
  thumbOn: "hsl(var(--primary-foreground))",
});

export const toggleTokens = {
  size: {
    small: {
      trackWidth: 32,
      trackHeight: 18,
      thumbSize: 14,
      thumbTranslate: 14,
      iconSize: 10,
      labelFontSize: primitiveFontSize.xs,
      paddingY: 3,
      gap: primitiveSpacing[2],
    },
    normal: {
      trackWidth: 40,
      trackHeight: 22,
      thumbSize: 18,
      thumbTranslate: 18,
      iconSize: 12,
      labelFontSize: primitiveFontSize.sm,
      paddingY: 3,
      gap: primitiveSpacing[2],
    },
    large: {
      trackWidth: 48,
      trackHeight: 28,
      thumbSize: 24,
      thumbTranslate: 20,
      iconSize: 14,
      labelFontSize: primitiveFontSize.sm,
      paddingY: 3,
      gap: primitiveSpacing[3],
    },
  } satisfies Record<ToggleSize, Record<string, number>>,
  radius: primitiveRadius.full,
  thumbShadow: "0 1px 1px rgb(0 0 0 / 0.12), 0 1px 3px rgb(0 0 0 / 0.24)",
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
  color: {
    default: brandColor(),
    blue: brandColor(),
    cyan: {
      ...brandColor(),
      iconOn: "var(--cyan-11)",
    },
    success: semanticColor("success"),
    warning: semanticColor("warning"),
    error: semanticColor("destructive"),
    neutral: {
      ...offState,
      thumbOn: "var(--neutral-1)",
      trackOn: "var(--neutral-12)",
      iconOn: "var(--neutral-12)",
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

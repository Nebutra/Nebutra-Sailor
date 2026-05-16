import {
  primitiveFontSize,
  primitiveFontWeight,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const noteSizes = ["small", "medium", "large"] as const;
export type NoteSize = (typeof noteSizes)[number];

export const noteTones = ["default", "secondary", "success", "warning", "error", "cyan"] as const;
export type NoteTone = (typeof noteTones)[number];

type NoteToneTokens = {
  readonly background: string;
  readonly filledBackground: string;
  readonly border: string;
  readonly foreground: string;
  readonly label: string;
  readonly icon: string;
  readonly link: string;
};

const semanticTone = (name: "success" | "warning" | "destructive"): NoteToneTokens => {
  const color = `hsl(var(--${name}))`;

  return {
    background: `color-mix(in oklch, ${color} 7%, transparent)`,
    filledBackground: `color-mix(in oklch, ${color} 14%, transparent)`,
    border: `color-mix(in oklch, ${color} 36%, transparent)`,
    foreground: "var(--neutral-12)",
    label: "var(--neutral-12)",
    icon: color,
    link: color,
  };
};

export const noteTokens = {
  radius: primitiveRadius.md,
  borderWidth: 1,
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
  size: {
    small: {
      minHeight: primitiveSizing.sm,
      paddingX: primitiveSpacing[3],
      paddingY: primitiveSpacing[2],
      gap: primitiveSpacing[2],
      iconSize: 14,
      fontSize: primitiveFontSize.xs,
      lineHeight: 18,
    },
    medium: {
      minHeight: primitiveSizing.md,
      paddingX: primitiveSpacing[4],
      paddingY: primitiveSpacing[3],
      gap: primitiveSpacing[2],
      iconSize: 16,
      fontSize: primitiveFontSize.sm,
      lineHeight: 20,
    },
    large: {
      minHeight: primitiveSizing.lg,
      paddingX: primitiveSpacing[4],
      paddingY: primitiveSpacing[3],
      gap: primitiveSpacing[3],
      iconSize: 18,
      fontSize: primitiveFontSize.base,
      lineHeight: 24,
    },
  } satisfies Record<NoteSize, Record<string, number>>,
  label: {
    fontWeight: primitiveFontWeight.semibold,
  },
  tone: {
    default: {
      background: "var(--neutral-1)",
      filledBackground: "var(--neutral-3)",
      border: "var(--neutral-7)",
      foreground: "var(--neutral-12)",
      label: "var(--neutral-12)",
      icon: "var(--neutral-10)",
      link: "var(--blue-9)",
    },
    secondary: {
      background: "var(--neutral-2)",
      filledBackground: "var(--neutral-3)",
      border: "var(--neutral-6)",
      foreground: "var(--neutral-11)",
      label: "var(--neutral-12)",
      icon: "var(--neutral-10)",
      link: "var(--blue-9)",
    },
    success: semanticTone("success"),
    warning: semanticTone("warning"),
    error: semanticTone("destructive"),
    cyan: {
      background: "color-mix(in oklch, var(--cyan-9) 7%, transparent)",
      filledBackground: "color-mix(in oklch, var(--cyan-9) 14%, transparent)",
      border: "color-mix(in oklch, var(--cyan-9) 36%, transparent)",
      foreground: "var(--neutral-12)",
      label: "var(--neutral-12)",
      icon: "var(--cyan-10)",
      link: "var(--cyan-11)",
    },
  } satisfies Record<NoteTone, NoteToneTokens>,
} as const;

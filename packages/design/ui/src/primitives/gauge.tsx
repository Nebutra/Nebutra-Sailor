"use client";

import * as React from "react";
import { cn } from "../utils/cn";

const gaugeSizes = {
  tiny: 20,
  small: 32,
  medium: 64,
  large: 128,
} as const;

const gapPercentBySize = {
  tiny: 9,
  small: 6,
  medium: 5,
  large: 5,
} as const;

const defaultGaugeColors = {
  "0": "hsl(var(--success))",
  "80": "hsl(var(--warning))",
  "95": "hsl(var(--destructive))",
} as const;

export type GaugeSize = keyof typeof gaugeSizes;
export type GaugeArcPriority = "default" | "equal";
export type LegacyGaugeArcPriority = "value" | "secondary";

export interface GaugeColorStop {
  /** Value threshold, 0-100. The stop applies when value >= this threshold. */
  value: number;
  /** CSS color string. Prefer semantic tokens or component CSS variables. */
  color: string;
}

export type GaugeColorMap = Record<string, string> & {
  /** Explicit primary arc color override. */
  primary?: string;
  /** Explicit secondary arc color override. */
  secondary?: string;
};

export interface GaugeProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    | "aria-busy"
    | "aria-valuemax"
    | "aria-valuemin"
    | "aria-valuenow"
    | "children"
    | "color"
    | "role"
  > {
  /** Current value, clamped to 0-100. */
  value?: number;
  /** Preset size or legacy pixel diameter. */
  size?: GaugeSize | number;
  /** Custom threshold colors. Prefer semantic token strings. */
  colors?: GaugeColorMap | GaugeColorStop[];
  /** Legacy track color override. Prefer `colors.secondary`. */
  secondaryColor?: string;
  /** Show the numeric value in the center. */
  showValue?: boolean;
  /** Legacy alias for `showValue`. A ReactNode is treated as center overlay content. */
  label?: boolean | React.ReactNode;
  /** Center overlay content, reserved for icon overlays. */
  children?: React.ReactNode;
  /** Arc geometry mode. Use `equal` for true ratios. */
  arcPriority?: GaugeArcPriority | LegacyGaugeArcPriority;
  /** Loading state when the value is unknown. */
  indeterminate?: boolean;
  /** Accessible name when not using aria-labelledby. */
  "aria-label"?: string;
  /** ID of adjacent label text. */
  "aria-labelledby"?: string;
}

type NormalizedGaugeSize = {
  key: GaugeSize;
  pixels: number;
};

type ArcGeometry = {
  primaryLength: number;
  secondaryLength: number;
  primaryRotation: number;
  secondaryRotation: number;
};

function clampValue(value: number | undefined): number {
  return Math.min(100, Math.max(0, value ?? 0));
}

function normalizeSize(size: GaugeProps["size"]): NormalizedGaugeSize {
  if (typeof size === "number") {
    if (size <= gaugeSizes.tiny) return { key: "tiny", pixels: size };
    if (size <= gaugeSizes.small) return { key: "small", pixels: size };
    if (size <= gaugeSizes.medium) return { key: "medium", pixels: size };
    return { key: "large", pixels: size };
  }

  const key = size ?? "medium";
  return { key, pixels: gaugeSizes[key] };
}

function normalizeArcPriority(arcPriority: GaugeProps["arcPriority"]): GaugeArcPriority {
  if (arcPriority === "equal" || arcPriority === "secondary") {
    return "equal";
  }

  return "default";
}

function resolveThresholdColor(value: number, colors: GaugeColorMap | GaugeColorStop[]): string {
  const stops = Array.isArray(colors)
    ? colors.map((stop) => [String(stop.value), stop.color] as const)
    : Object.entries(colors).filter(([key]) => Number.isFinite(Number(key)));

  const sortedStops = stops
    .map(([key, color]) => ({ threshold: Number(key), color }))
    .filter((stop) => Number.isFinite(stop.threshold))
    .sort((a, b) => a.threshold - b.threshold);

  let resolved = sortedStops[0]?.color ?? "currentColor";

  for (const stop of sortedStops) {
    if (value >= stop.threshold) {
      resolved = stop.color;
    }
  }

  return resolved;
}

function resolvePrimaryColor(value: number, colors: GaugeProps["colors"]): string {
  if (Array.isArray(colors)) {
    return resolveThresholdColor(value, colors);
  }

  if (colors?.primary) {
    return colors.primary;
  }

  return resolveThresholdColor(value, colors ?? defaultGaugeColors);
}

function resolveSecondaryColor(colors: GaugeProps["colors"], secondaryColor?: string): string {
  if (!Array.isArray(colors) && colors?.secondary) {
    return colors.secondary;
  }

  return secondaryColor ?? "hsl(var(--muted))";
}

function getArcGeometry(
  value: number,
  circumference: number,
  gapPercent: number,
  arcPriority: GaugeArcPriority,
): ArcGeometry {
  if (arcPriority === "equal") {
    const length = (circumference * (100 - 2 * gapPercent)) / 100 / 2;
    const halfGapDegrees = (gapPercent * 3.6) / 2;

    return {
      primaryLength: length,
      secondaryLength: length,
      primaryRotation: -90 + halfGapDegrees,
      secondaryRotation: 270 - halfGapDegrees,
    };
  }

  const gap = value === 0 ? 0 : 2 * gapPercent;
  const secondaryPercent = Math.max(100 - gap - value, 0);

  return {
    primaryLength: (circumference * value) / 100,
    secondaryLength: (circumference * secondaryPercent) / 100,
    primaryRotation: -90,
    secondaryRotation: 270 - gapPercent * 3.6,
  };
}

function getValueTextClass(size: GaugeSize): string {
  switch (size) {
    case "small":
      return "text-xs font-medium";
    case "large":
      return "text-3xl font-semibold";
    case "medium":
      return "text-lg font-medium";
    case "tiny":
      return "text-xs font-medium";
  }
}

/**
 * Gauge — circular ratio visual for fixed 0-100 comparisons.
 *
 * Use Progress for determinate task progress. Pair Gauge with adjacent text and
 * connect it via `aria-labelledby` whenever the visual is not self-evident.
 */
export const Gauge = React.forwardRef<HTMLDivElement, GaugeProps>(
  (
    {
      value,
      size = "medium",
      colors,
      secondaryColor,
      showValue = false,
      label,
      children,
      arcPriority = "default",
      indeterminate = false,
      className,
      style,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) => {
    const normalizedSize = normalizeSize(size);
    const normalizedPriority = normalizeArcPriority(arcPriority);
    const clampedValue = clampValue(value);
    const radius = normalizedSize.key === "tiny" ? 42.5 : 45;
    const circumference = 2 * Math.PI * radius;
    const geometry = getArcGeometry(
      clampedValue,
      circumference,
      gapPercentBySize[normalizedSize.key],
      normalizedPriority,
    );
    const shouldShowValue = (showValue || label === true) && normalizedSize.key !== "tiny";
    const centerOverlay = label !== true && label !== false ? label : children;
    const primaryColor = resolvePrimaryColor(clampedValue, colors);
    const trackColor = resolveSecondaryColor(colors, secondaryColor);
    const accessibleLabel =
      ariaLabel ?? (indeterminate ? "Calculating value" : `${Math.round(clampedValue)} percent`);

    return (
      <div
        {...props}
        ref={ref}
        role="progressbar"
        aria-label={ariaLabelledBy ? undefined : accessibleLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-busy={indeterminate || undefined}
        className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: normalizedSize.pixels, height: normalizedSize.pixels, ...style }}
      >
        <svg
          aria-hidden="true"
          fill="none"
          height={normalizedSize.pixels}
          width={normalizedSize.pixels}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={trackColor}
            strokeDasharray={`${indeterminate ? circumference : geometry.secondaryLength} ${circumference}`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="10"
            className="origin-center transition-[stroke-dasharray,stroke] duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `rotate(${geometry.secondaryRotation}deg) scaleY(-1)` }}
          />

          {(clampedValue > 0 || normalizedPriority === "equal" || indeterminate) && (
            <g
              className={cn(
                indeterminate && "origin-center animate-spin motion-reduce:animate-none",
              )}
            >
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={primaryColor}
                strokeDasharray={`${indeterminate ? circumference * 0.25 : geometry.primaryLength} ${circumference}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="10"
                className="origin-center transition-[stroke-dasharray,stroke] duration-300 ease-out motion-reduce:transition-none"
                style={{ transform: `rotate(${geometry.primaryRotation}deg)` }}
              />
            </g>
          )}
        </svg>

        {shouldShowValue && !indeterminate ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center tabular-nums text-foreground",
              getValueTextClass(normalizedSize.key),
            )}
          >
            {Math.round(clampedValue)}
          </span>
        ) : null}

        {centerOverlay && !shouldShowValue ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground"
          >
            {centerOverlay}
          </span>
        ) : null}
      </div>
    );
  },
);

Gauge.displayName = "Gauge";

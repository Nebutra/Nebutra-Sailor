"use client";

import type { ComponentProps, CSSProperties } from "react";

import {
  type SpinnerSize,
  type SpinnerTone,
  spinnerSizes,
  spinnerTokens,
  spinnerTones,
} from "../tokens/components/spinner";
import { cn } from "../utils/cn";

export type SpinnerVariant =
  | "default"
  | "circle"
  | "pinwheel"
  | "circle-filled"
  | "ellipsis"
  | "ring"
  | "bars"
  | "infinite";

type SpinnerCssVar =
  | "--spinner-size"
  | "--spinner-bar-width"
  | "--spinner-bar-height"
  | "--spinner-bar-left"
  | "--spinner-bar-top"
  | "--spinner-bar-translate"
  | "--spinner-bar-radius"
  | "--spinner-duration"
  | "--spinner-easing";

type SpinnerCssVars = CSSProperties & Record<SpinnerCssVar, string>;

export interface SpinnerProps extends Omit<ComponentProps<"span">, "children" | "color" | "role"> {
  /** Size token or explicit pixel size. Prefer tokens inside primitives. */
  size?: SpinnerSize | number;
  /** Semantic color tone. Use className only for local composition overrides. */
  tone?: SpinnerTone;
  /** Accessible status label. Omit when the parent already exposes aria-busy. */
  label?: string;
  /** Force decorative mode even when a label would otherwise announce status. */
  decorative?: boolean;
  /**
   * @deprecated Spinner is intentionally a single canonical loading indicator.
   * Legacy variants are accepted for source compatibility and render the same
   * tokenized spinner.
   */
  variant?: SpinnerVariant;
}

function resolveSize(size: SpinnerProps["size"]) {
  if (typeof size === "number") {
    return `${size}px`;
  }

  return `${spinnerSizes[size ?? spinnerTokens.defaultSize]}px`;
}

function getSpinnerStyle(size: SpinnerProps["size"], style: CSSProperties | undefined) {
  return {
    "--spinner-size": resolveSize(size),
    "--spinner-bar-width": spinnerTokens.barWidth,
    "--spinner-bar-height": spinnerTokens.barHeight,
    "--spinner-bar-left": spinnerTokens.barLeft,
    "--spinner-bar-top": spinnerTokens.barTop,
    "--spinner-bar-translate": spinnerTokens.barTranslate,
    "--spinner-bar-radius": `${spinnerTokens.barRadius}px`,
    "--spinner-duration": `${spinnerTokens.motion.duration}ms`,
    "--spinner-easing": spinnerTokens.motion.easing,
    ...style,
  } satisfies SpinnerCssVars;
}

function getBarOpacity(index: number) {
  const fadeRange = spinnerTokens.opacity.max - spinnerTokens.opacity.min;
  const progress = index / (spinnerTokens.barCount - 1);

  return Number((spinnerTokens.opacity.min + fadeRange * progress).toFixed(2));
}

function getBarTransform(index: number) {
  return `rotate(${index * (360 / spinnerTokens.barCount)}deg) translate(var(--spinner-bar-translate))`;
}

export function Spinner({
  className,
  style,
  size,
  tone = "default",
  label,
  decorative,
  variant = "default",
  "aria-label": ariaLabel,
  ...props
}: SpinnerProps) {
  const accessibleLabel = ariaLabel ?? label;
  const isDecorative = decorative ?? !accessibleLabel;
  const accessibilityProps = isDecorative
    ? ({ "aria-hidden": true } as const)
    : ({
        "aria-label": accessibleLabel,
        "aria-live": "polite",
        role: "status",
      } as const);

  return (
    <span
      data-slot="spinner"
      data-variant={variant}
      className={cn(
        "relative inline-block shrink-0 align-[-0.125em]",
        "[block-size:var(--spinner-size)] [inline-size:var(--spinner-size)]",
        spinnerTones[tone],
        className,
      )}
      style={getSpinnerStyle(size, style)}
      {...accessibilityProps}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 origin-center",
          "[animation:spin_var(--spinner-duration)_var(--spinner-easing)_infinite]",
          "motion-reduce:animate-none",
        )}
      >
        {Array.from({ length: spinnerTokens.barCount }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              "absolute bg-current",
              "h-[var(--spinner-bar-height)] w-[var(--spinner-bar-width)]",
              "rounded-[var(--spinner-bar-radius)]",
            )}
            style={{
              left: "calc(50% - var(--spinner-bar-left))",
              opacity: getBarOpacity(index),
              top: "calc(50% - var(--spinner-bar-top))",
              transform: getBarTransform(index),
            }}
          />
        ))}
      </span>
    </span>
  );
}

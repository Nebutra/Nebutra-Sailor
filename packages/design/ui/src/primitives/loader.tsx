"use client";

import type * as React from "react";

import { cn } from "../utils/cn";
import { LoadingDots } from "./loading-dots";
import { Spinner, type SpinnerVariant } from "./spinner";

export interface LoaderProps {
  variant?:
    | "circular"
    | "classic"
    | "pulse"
    | "pulse-dot"
    | "dots"
    | "typing"
    | "wave"
    | "bars"
    | "terminal"
    | "text-blink"
    | "text-shimmer"
    | "loading-dots";
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export interface LoaderSizeProps {
  className?: string | undefined;
  size?: "sm" | "md" | "lg";
}

export interface TextLoaderProps extends LoaderSizeProps {
  text?: string | undefined;
}

const spinnerSizes = {
  sm: "sm",
  md: "md",
  lg: "lg",
} as const satisfies Record<NonNullable<LoaderSizeProps["size"]>, "sm" | "md" | "lg">;

const dotSizes = {
  sm: 4,
  md: 5,
  lg: 6,
} as const satisfies Record<NonNullable<LoaderSizeProps["size"]>, number>;

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const satisfies Record<NonNullable<LoaderSizeProps["size"]>, string>;

const spinnerVariantByLoader = {
  circular: "default",
  classic: "default",
  pulse: "ring",
  "pulse-dot": "ring",
  wave: "bars",
  bars: "bars",
  terminal: "default",
} as const satisfies Record<string, SpinnerVariant>;

function TokenizedSpinner({
  className,
  size = "md",
  variant = "default",
}: LoaderSizeProps & { variant?: SpinnerVariant }) {
  return (
    <Spinner className={className} label="Loading" size={spinnerSizes[size]} variant={variant} />
  );
}

function TokenizedDots({
  className,
  size = "md",
  children,
}: LoaderSizeProps & { children?: React.ReactNode }) {
  return (
    <LoadingDots
      className={cn("font-medium text-primary", textSizes[size], className)}
      size={dotSizes[size]}
    >
      {children}
    </LoadingDots>
  );
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function CircularLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader.circular} />;
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function ClassicLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader.classic} />;
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function PulseLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader.pulse} />;
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function PulseDotLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader["pulse-dot"]} />;
}

/** @deprecated Use LoadingDots directly for inline progress copy. */
export function DotsLoader(props: LoaderSizeProps) {
  return <TokenizedDots {...props} />;
}

/** @deprecated Use LoadingDots directly for inline progress copy. */
export function TypingLoader(props: LoaderSizeProps) {
  return <TokenizedDots {...props} />;
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function WaveLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader.wave} />;
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function BarsLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader.bars} />;
}

/** @deprecated Use Spinner directly for single-action loading feedback. */
export function TerminalLoader(props: LoaderSizeProps) {
  return <TokenizedSpinner {...props} variant={spinnerVariantByLoader.terminal} />;
}

/** @deprecated Use LoadingDots directly for inline progress copy. */
export function TextBlinkLoader({ text = "Thinking", ...props }: TextLoaderProps) {
  return <TokenizedDots {...props}>{text}</TokenizedDots>;
}

/** @deprecated Use LoadingDots directly for inline progress copy. */
export function TextShimmerLoader({ text = "Thinking", ...props }: TextLoaderProps) {
  return <TokenizedDots {...props}>{text}</TokenizedDots>;
}

/** @deprecated Use LoadingDots directly for inline progress copy. */
export function TextDotsLoader({ text = "Thinking", ...props }: TextLoaderProps) {
  return <TokenizedDots {...props}>{text}</TokenizedDots>;
}

/**
 * Legacy loader facade.
 *
 * The design-system contract intentionally keeps one canonical spinner and one
 * inline dots primitive. Historical variants remain source-compatible but no
 * longer own private keyframes, durations, or easing curves.
 */
export function Loader({ variant = "circular", size = "md", text, className }: LoaderProps) {
  switch (variant) {
    case "dots":
    case "typing":
    case "text-blink":
    case "text-shimmer":
    case "loading-dots":
      return <TextDotsLoader text={text} size={size} className={className} />;
    case "pulse":
      return <PulseLoader size={size} className={className} />;
    case "pulse-dot":
      return <PulseDotLoader size={size} className={className} />;
    case "wave":
      return <WaveLoader size={size} className={className} />;
    case "bars":
      return <BarsLoader size={size} className={className} />;
    case "terminal":
      return <TerminalLoader size={size} className={className} />;
    case "classic":
      return <ClassicLoader size={size} className={className} />;
    default:
      return <CircularLoader size={size} className={className} />;
  }
}

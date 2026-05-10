"use client";

import * as React from "react";
import { cn } from "../utils/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * GradientBlur Component
 *
 * An ambient glow/blur effect for backgrounds.
 *
 * Usage:
 * <GradientBlur position="top-right" color="primary" />
 * <GradientBlur position="center" color="secondary" size="lg" />
 * ───────────────────────────────────────────────────────────────────────────── */

type GradientPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type GradientColor = "primary" | "secondary" | "accent" | "muted" | "custom";
type GradientSize = "sm" | "md" | "lg" | "xl";

const positionStyles: Record<GradientPosition, string> = {
  "top-left": "-top-1/4 -left-1/4",
  "top-center": "-top-1/4 left-1/2 -translate-x-1/2",
  "top-right": "-top-1/4 -right-1/4",
  "center-left": "top-1/2 -left-1/4 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "center-right": "top-1/2 -right-1/4 -translate-y-1/2",
  "bottom-left": "-bottom-1/4 -left-1/4",
  "bottom-center": "-bottom-1/4 left-1/2 -translate-x-1/2",
  "bottom-right": "-bottom-1/4 -right-1/4",
};

const colorStyles: Record<Exclude<GradientColor, "custom">, string> = {
  primary: "from-primary/20 via-primary/10 to-transparent",
  secondary: "from-secondary/20 via-secondary/10 to-transparent",
  accent: "from-accent/20 via-accent/10 to-transparent",
  muted: "from-muted/30 via-muted/15 to-transparent",
};

const sizeStyles: Record<GradientSize, string> = {
  sm: "w-64 h-64",
  md: "w-96 h-96",
  lg: "w-[32rem] h-[32rem]",
  xl: "w-[48rem] h-[48rem]",
};

export interface GradientBlurProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: GradientPosition;
  color?: GradientColor;
  size?: GradientSize;
  blur?: "sm" | "md" | "lg" | "xl";
  customColor?: string;
  animate?: boolean;
}

export const GradientBlur = React.forwardRef<HTMLDivElement, GradientBlurProps>(
  (
    {
      className,
      position = "center",
      color = "primary",
      size = "md",
      blur = "lg",
      customColor,
      animate = false,
      ...props
    },
    ref,
  ) => {
    const blurStyles = {
      sm: "blur-2xl",
      md: "blur-3xl",
      lg: "blur-[100px]",
      xl: "blur-[150px]",
    };

    const gradientClass =
      color === "custom" && customColor
        ? customColor
        : colorStyles[color as Exclude<GradientColor, "custom">];

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-none absolute rounded-full bg-gradient-radial",
          positionStyles[position],
          sizeStyles[size],
          blurStyles[blur],
          gradientClass,
          animate && "animate-pulse",
          className,
        )}
        aria-hidden="true"
        {...props}
      />
    );
  },
);
GradientBlur.displayName = "GradientBlur";

/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Multi-gradient ambient background preset
 */
export interface AmbientBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "vivid" | "minimal";
}

export const AmbientBackground = React.forwardRef<HTMLDivElement, AmbientBackgroundProps>(
  ({ className, variant = "subtle", children, ...props }, ref) => {
    const gradients = {
      subtle: [
        {
          position: "top-left" as const,
          color: "primary" as const,
          size: "lg" as const,
        },
        {
          position: "bottom-right" as const,
          color: "secondary" as const,
          size: "md" as const,
        },
      ],
      vivid: [
        {
          position: "top-left" as const,
          color: "primary" as const,
          size: "xl" as const,
        },
        {
          position: "top-right" as const,
          color: "accent" as const,
          size: "lg" as const,
        },
        {
          position: "bottom-center" as const,
          color: "secondary" as const,
          size: "lg" as const,
        },
      ],
      minimal: [
        {
          position: "center" as const,
          color: "muted" as const,
          size: "xl" as const,
        },
      ],
    };

    return (
      <div ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
        {gradients[variant].map((config, index) => (
          <GradientBlur key={index} {...config} />
        ))}
        {children}
      </div>
    );
  },
);
AmbientBackground.displayName = "AmbientBackground";

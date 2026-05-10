"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

export interface ShineBorderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** Width of the border in pixels */
  borderWidth?: number;
  /** Duration of the animation in seconds */
  duration?: number;
  /** Color of the border, can be a single color or an array of colors */
  shineColor?: string | string[];
  /** Border radius in pixels (container mode) */
  borderRadius?: number;
  /** Deprecated: use shineColor instead */
  color?: string | string[];
  /** Content to render inside (container mode). If omitted, acts as overlay. */
  children?: React.ReactNode;
}

/**
 * ShineBorder - animated background border effect
 *
 * Two modes:
 * - Overlay (no children): absolute, stretches to parent with rounded inherit
 * - Container (with children): wraps content with rounded container
 */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor,
  color = ["#0033FE", "#0BF1C3", "#5c7cfa"],
  borderRadius = 8,
  className,
  style,
  children,
  ...props
}: ShineBorderProps) {
  const effective = shineColor ?? color;
  const gradient = Array.isArray(effective) ? effective.join(",") : effective;

  // Overlay mode: no children
  if (!children) {
    return (
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--duration": `${duration}s`,
            backgroundImage: `radial-gradient(transparent,transparent, ${gradient},transparent,transparent)`,
            backgroundSize: "300% 300%",
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "var(--border-width)",
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "motion-safe:animate-shine pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
          className,
        )}
        aria-hidden="true"
        {...props}
      />
    );
  }

  // Container mode: wraps content
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "relative min-h-[60px] w-fit min-w-[300px] place-items-center rounded-[--border-radius] bg-background p-3 text-foreground",
        className,
      )}
      {...props}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${gradient},transparent,transparent)`,
          } as React.CSSProperties
        }
        className="before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[''] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:[mask:--mask-linear-gradient] motion-safe:before:animate-shine"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

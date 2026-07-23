"use client";

import type React from "react";
import { useCallback, useEffect } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "../shared/animation/motion";

import { cn } from "../utils/cn";

export interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  /** Size of the gradient spotlight effect */
  gradientSize?: number;
  /** Color of the inner gradient effect */
  gradientColor?: string;
  /** Opacity of the inner gradient effect */
  gradientOpacity?: number;
  /** Start color of the gradient border */
  gradientFrom?: string;
  /** End color of the gradient border */
  gradientTo?: string;
}

/**
 * MagicCard - Spotlight effect card that follows mouse cursor
 *
 * @description
 * A card component with a gradient spotlight effect that follows the mouse cursor
 * and highlights borders on hover. Perfect for feature cards, pricing cards, or
 * any interactive card element.
 *
 * @example Basic usage
 * ```tsx
 * <MagicCard>
 *   <div className="p-4">
 *     <p>Hello World</p>
 *     <span>Hover me</span>
 *   </div>
 * </MagicCard>
 * ```
 *
 * @example Custom gradient colors
 * ```tsx
 * <MagicCard
 *   gradientFrom="hsl(var(--primary))"
 *   gradientTo="var(--brand-accent)"
 *   gradientColor="color-mix(in oklab, hsl(var(--primary)) 16%, transparent)"
 * >
 *   <div className="p-6">Custom gradient</div>
 * </MagicCard>
 * ```
 */
export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "color-mix(in oklab, hsl(var(--primary)) 16%, transparent)",
  gradientOpacity = 0.8,
  gradientFrom = "hsl(var(--primary))",
  gradientTo = "hsl(var(--muted-foreground))",
}: MagicCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);
  const borderGradient = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
    ${gradientFrom},
    ${gradientTo},
    var(--border) 100%
    )
  `;
  const spotlightGradient = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
  `;

  const reset = useCallback(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [gradientSize, mouseX, mouseY]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY, shouldReduceMotion],
  );

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        reset();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        reset();
      }
    };

    window.addEventListener("pointerout", handleGlobalPointerOut);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pointerout", handleGlobalPointerOut);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reset]);

  return (
    <div
      className={cn("group relative rounded-[inherit]", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={reset}
    >
      <motion.div
        className="bg-border pointer-events-none absolute inset-0 rounded-[inherit] duration-300 group-hover:opacity-100"
        style={{
          background: shouldReduceMotion
            ? `linear-gradient(135deg, ${gradientFrom}, ${gradientTo}, var(--border) 100%)`
            : borderGradient,
        }}
      />
      <div className="bg-background absolute inset-px rounded-[inherit]" />
      <motion.div
        className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: shouldReduceMotion ? "transparent" : spotlightGradient,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

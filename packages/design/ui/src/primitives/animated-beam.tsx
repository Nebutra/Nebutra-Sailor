"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import {
  type AnimatedBeamIntensity,
  type AnimatedBeamTone,
  animatedBeamTokens,
} from "../tokens/components/animated-beam";
import { cn } from "../utils/cn";

/**
 * Props for the AnimatedBeam component
 */
export interface AnimatedBeamProps {
  /** Additional CSS classes */
  className?: string;
  /** Ref to the container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Ref to the element where the beam starts */
  fromRef: React.RefObject<HTMLElement | null>;
  /** Ref to the element where the beam ends */
  toRef: React.RefObject<HTMLElement | null>;
  /** Curvature of the beam path (default: 0) */
  curvature?: number;
  /** Reverse the animation direction */
  reverse?: boolean;
  /** Semantic beam color. Prefer this over raw color overrides. */
  tone?: AnimatedBeamTone;
  /** Visual emphasis for the static rail and travelling beam. */
  intensity?: AnimatedBeamIntensity;
  /** Animation duration in seconds. Defaults to the component motion token (4s). */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Advanced override: color of the static path line */
  pathColor?: string;
  /** Advanced override: width of the static path line */
  pathWidth?: number;
  /** Advanced override: opacity of the static path line */
  pathOpacity?: number;
  /** Advanced override: start color of the gradient */
  gradientStartColor?: string;
  /** Advanced override: stop color of the gradient */
  gradientStopColor?: string;
  /** X offset for the start point */
  startXOffset?: number;
  /** Y offset for the start point */
  startYOffset?: number;
  /** X offset for the end point */
  endXOffset?: number;
  /** Y offset for the end point */
  endYOffset?: number;
}

/**
 * AnimatedBeam - Animated beam of light connecting elements
 *
 * An animated beam that travels along a path between two elements.
 * Useful for showcasing integrations, data flow, or connections.
 *
 * @example Basic usage
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const fromRef = useRef<HTMLDivElement>(null);
 * const toRef = useRef<HTMLDivElement>(null);
 *
 * <div ref={containerRef} className="relative">
 *   <div ref={fromRef}>Start</div>
 *   <div ref={toRef}>End</div>
 *   <AnimatedBeam
 *     containerRef={containerRef}
 *     fromRef={fromRef}
 *     toRef={toRef}
 *   />
 * </div>
 * ```
 *
 * @example Curved beam
 * ```tsx
 * <AnimatedBeam
 *   containerRef={containerRef}
 *   fromRef={fromRef}
 *   toRef={toRef}
 *   curvature={50}
 * />
 * ```
 *
 * @example Custom colors
 * ```tsx
 * <AnimatedBeam
 *   containerRef={containerRef}
 *   fromRef={fromRef}
 *   toRef={toRef}
 *   tone="brand"
 *   intensity="normal"
 * />
 * ```
 */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  tone = "brand",
  intensity = "normal",
  duration,
  delay = 0,
  pathColor,
  pathWidth,
  pathOpacity,
  gradientStartColor,
  gradientStopColor,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const shouldReduceMotion = useReducedMotion();
  const id = React.useId().replace(/:/g, "");
  const [pathD, setPathD] = React.useState("");
  const [svgDimensions, setSvgDimensions] = React.useState({
    width: 0,
    height: 0,
  });

  const toneToken = animatedBeamTokens.tone[tone];
  const railOpacity = pathOpacity ?? animatedBeamTokens.path.opacity[intensity];
  const railWidth = pathWidth ?? animatedBeamTokens.path.width;
  const beamWidth = pathWidth ?? animatedBeamTokens.beam.width[intensity];
  const beamDuration = duration ?? animatedBeamTokens.beam.duration / 1000;

  const resolvedPathColor = pathColor ?? toneToken.pathColor;
  const resolvedStartColor = gradientStartColor ?? toneToken.startColor;
  const resolvedStopColor = gradientStopColor ?? toneToken.stopColor;

  React.useEffect(() => {
    const updatePath = () => {
      if (!containerRef.current || !fromRef.current || !toRef.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const fromRect = fromRef.current.getBoundingClientRect();
      const toRect = toRef.current.getBoundingClientRect();

      const svgWidth = containerRect.width;
      const svgHeight = containerRect.height;
      setSvgDimensions({ width: svgWidth, height: svgHeight });

      const startX = fromRect.left - containerRect.left + fromRect.width / 2 + startXOffset;
      const startY = fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
      const endX = toRect.left - containerRect.left + toRect.width / 2 + endXOffset;
      const endY = toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

      const controlX = (startX + endX) / 2;
      const controlY = (startY + endY) / 2 + curvature;

      const d = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
      setPathD(d);
    };

    // Initial calculation
    updatePath();

    const resizeObserver = new ResizeObserver(() => {
      updatePath();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (fromRef.current) resizeObserver.observe(fromRef.current);
    if (toRef.current) resizeObserver.observe(toRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  return (
    <svg
      aria-hidden="true"
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute left-0 top-0 transform-gpu stroke-2", className)}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <path
        d={pathD}
        stroke={resolvedPathColor}
        strokeWidth={railWidth}
        strokeOpacity={railOpacity}
        strokeLinecap="round"
      />
      {!shouldReduceMotion && (
        <path
          d={pathD}
          stroke={`url(#${id})`}
          strokeWidth={beamWidth}
          strokeOpacity="1"
          strokeLinecap="round"
        />
      )}
      <defs>
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: "0%",
            x2: "0%",
            y1: "0%",
            y2: "0%",
          }}
          animate={{
            x1: reverse ? ["90%", "-10%"] : ["10%", "110%"],
            x2: reverse ? ["100%", "0%"] : ["0%", "100%"],
            y1: ["0%", "0%"],
            y2: ["0%", "0%"],
          }}
          transition={{
            delay,
            duration: beamDuration,
            // framer-motion v12 typed `ease` as Easing | EasingFunction tuples
            // — accept the cubic-bezier() string token at runtime, mute the
            // type check (CSS-side consumers still use the same value).
            // biome-ignore lint/suspicious/noExplicitAny: framer-motion Easing union narrows incorrectly for cubic-bezier() string literals.
            ease: animatedBeamTokens.beam.easing as any,
            repeat: Infinity,
            repeatDelay: 0,
          }}
        >
          <stop stopColor={resolvedStartColor} stopOpacity="0" />
          <stop stopColor={resolvedStartColor} />
          <stop offset="32.5%" stopColor={resolvedStopColor} />
          <stop offset="100%" stopColor={resolvedStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
}

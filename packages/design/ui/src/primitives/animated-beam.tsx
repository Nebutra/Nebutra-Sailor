"use client";

import { motion } from "framer-motion";
import * as React from "react";
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
  /** Animation duration in seconds (default: random 4-7) */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Color of the path line */
  pathColor?: string;
  /** Width of the path line */
  pathWidth?: number;
  /** Opacity of the path line */
  pathOpacity?: number;
  /** Start color of the gradient */
  gradientStartColor?: string;
  /** Stop color of the gradient */
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
 *   gradientStartColor="#00ff00"
 *   gradientStopColor="#0000ff"
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
  duration,
  delay = 0,
  pathColor = "gray",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const id = React.useId().replace(/:/g, "");
  const [pathD, setPathD] = React.useState("");
  const [svgDimensions, setSvgDimensions] = React.useState({
    width: 0,
    height: 0,
  });

  // Generate random duration if not specified on the client to prevent SSR hydration mismatches
  const [animationDuration, setAnimationDuration] = React.useState(duration ?? 4);

  React.useEffect(() => {
    if (duration === undefined) {
      setAnimationDuration(Math.random() * 3 + 4);
    }
  }, [duration]);

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

    // Setup ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      updatePath();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

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
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        stroke={`url(#${id})`}
        strokeWidth={pathWidth}
        strokeOpacity="1"
        strokeLinecap="round"
      />
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
            duration: animationDuration,
            ease: [0.16, 1, 0.3, 1],
            repeat: Infinity,
            repeatDelay: 0,
          }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
}

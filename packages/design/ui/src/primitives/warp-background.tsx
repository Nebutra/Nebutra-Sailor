"use client";

import { motion } from "motion/react";
import type React from "react";
import { type HTMLAttributes, useCallback, useMemo } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for WarpBackground component
 *
 * @description
 * A card container with a 3D perspective grid background and animated beams.
 * Creates a time-warping, sci-fi aesthetic effect with beams traveling
 * along the grid from all four sides.
 *
 * **UX Scenarios:**
 * - Hero section feature cards
 * - Pricing cards with premium feel
 * - CTA sections with futuristic aesthetic
 * - Dashboard widgets with tech branding
 * - Product showcase containers
 *
 * **Visual Effect:**
 * - 3D perspective grid on all four sides
 * - Animated color beams traveling along grid lines
 * - Creates depth illusion with CSS transforms
 */
export interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Content to display inside the warp container
   */
  children: React.ReactNode;
  /**
   * Perspective depth in pixels (lower = more dramatic)
   * @default 100
   */
  perspective?: number;
  /**
   * Number of beams per side
   * @default 3
   */
  beamsPerSide?: number;
  /**
   * Size of each beam as percentage
   * @default 5
   */
  beamSize?: number;
  /**
   * Maximum delay before beam starts (seconds)
   * @default 3
   */
  beamDelayMax?: number;
  /**
   * Minimum delay before beam starts (seconds)
   * @default 0
   */
  beamDelayMin?: number;
  /**
   * Duration of beam animation (seconds)
   * @default 3
   */
  beamDuration?: number;
  /**
   * Color of the grid lines (CSS color value)
   * @default "var(--border)"
   */
  gridColor?: string;
}

/**
 * Props for internal Beam component
 */
interface BeamProps {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
}

// =============================================================================
// Internal Components
// =============================================================================

/**
 * Animated beam that travels along the grid
 */
const Beam: React.FC<BeamProps> = ({ width, x, delay, duration }) => {
  // Generate random hue and aspect ratio for variety
  const hue = useMemo(() => {
    const brandHues = [210, 218, 228, 238, 168, 175, 185];
    return brandHues[Math.floor(Math.random() * brandHues.length)];
  }, []);
  const aspectRatio = useMemo(() => Math.floor(Math.random() * 10) + 1, []);

  return (
    <motion.div
      style={
        {
          "--x": `${x}`,
          "--width": `${width}`,
          "--aspect-ratio": `${aspectRatio}`,
          "--background": `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
        } as any
      }
      className="absolute left-[var(--x)] top-0 [aspect-ratio:1/var(--aspect-ratio)] [background:var(--background)] [width:var(--width)]"
      initial={{ y: "100cqmax", x: "-50%" }}
      animate={{ y: "-100%", x: "-50%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * WarpBackground - 3D perspective grid container with animated beams
 *
 * @example
 * ```tsx
 * // Basic usage
 * <WarpBackground>
 *   <h2>Welcome to the Future</h2>
 *   <p>Experience the next generation.</p>
 * </WarpBackground>
 *
 * // Custom configuration
 * <WarpBackground
 *   perspective={150}
 *   beamsPerSide={5}
 *   beamSize={3}
 *   beamDuration={4}
 *   gridColor="rgba(59, 130, 246, 0.3)"
 *   className="p-12"
 * >
 *   <PricingCard />
 * </WarpBackground>
 *
 * // Dramatic close perspective
 * <WarpBackground perspective={50} beamSize={8}>
 *   <CTAContent />
 * </WarpBackground>
 * ```
 */
export const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = "var(--border)",
  ...props
}) => {
  // Generate beam positions and delays for each side
  const generateBeams = useCallback(() => {
    const beams: Array<{ x: number; delay: number }> = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      const delay = Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

  const topBeams = useMemo(() => generateBeams(), [generateBeams]);
  const rightBeams = useMemo(() => generateBeams(), [generateBeams]);
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
  const leftBeams = useMemo(() => generateBeams(), [generateBeams]);

  // Common grid background style
  const gridBackgroundClass =
    "[background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [transform-style:preserve-3d]";

  return (
    <div className={cn("relative rounded-[var(--radius-lg)] border p-20", className)} {...props}>
      {/* 3D Grid Container */}
      <div
        style={
          {
            "--perspective": `${perspective}px`,
            "--grid-color": gridColor,
            "--beam-size": `${beamSize}%`,
          } as React.CSSProperties
        }
        className="pointer-events-none absolute left-0 top-0 size-full overflow-hidden [clipPath:inset(0)] [container-type:size] [perspective:var(--perspective)] [transform-style:preserve-3d]"
        aria-hidden="true"
      >
        {/* Top side */}
        <div
          className={cn(
            "absolute z-20 [container-type:inline-size] [height:100cqmax] [width:100cqi] [transform-origin:50%_0%] [transform:rotateX(-90deg)]",
            gridBackgroundClass,
          )}
        >
          {topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>

        {/* Bottom side */}
        <div
          className={cn(
            "absolute top-full [container-type:inline-size] [height:100cqmax] [width:100cqi] [transform-origin:50%_0%] [transform:rotateX(-90deg)]",
            gridBackgroundClass,
          )}
        >
          {bottomBeams.map((beam, index) => (
            <Beam
              key={`bottom-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>

        {/* Left side */}
        <div
          className={cn(
            "absolute left-0 top-0 [container-type:inline-size] [height:100cqmax] [width:100cqh] [transform-origin:0%_0%] [transform:rotate(90deg)_rotateX(-90deg)]",
            gridBackgroundClass,
          )}
        >
          {leftBeams.map((beam, index) => (
            <Beam
              key={`left-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>

        {/* Right side */}
        <div
          className={cn(
            "absolute right-0 top-0 [container-type:inline-size] [height:100cqmax] [width:100cqh] [transform-origin:100%_0%] [transform:rotate(-90deg)_rotateX(-90deg)]",
            gridBackgroundClass,
          )}
        >
          {rightBeams.map((beam, index) => (
            <Beam
              key={`right-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
};

export default WarpBackground;

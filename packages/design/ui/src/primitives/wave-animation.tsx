"use client";

import { useEffect, useRef } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for WaveAnimation component
 *
 * @description
 * An animated canvas-based wave bars visualization with trailing effect.
 * Creates a colorful audio-visualizer-like wave animation.
 *
 * **UX Scenarios:**
 * - Music/audio app backgrounds
 * - Creative agency hero sections
 * - Loading/processing state visualization
 * - Festival/event promotional pages
 * - Podcast/streaming platform backgrounds
 *
 * **Performance Notes:**
 * - Uses requestAnimationFrame for smooth animation
 * - Semi-transparent overlay creates trailing effect
 * - Auto-resizes with window
 */
export interface WaveAnimationProps {
  /**
   * Color palette for wave bars
   * @default Ocean/sunset gradient palette
   */
  palette?: string[];
  /**
   * Number of wave bars
   * @default 20
   */
  barCount?: number;
  /**
   * Width of each bar in pixels
   * @default 100
   */
  barWidth?: number;
  /**
   * Animation speed multiplier
   * @default 1
   */
  speed?: number;
  /**
   * Trail opacity (0-1, lower = longer trails)
   * @default 0.03
   */
  trailOpacity?: number;
  /**
   * Wave amplitude multiplier
   * @default 1
   */
  amplitude?: number;
  /**
   * Whether animation is paused
   * @default false
   */
  paused?: boolean;
  /**
   * Canvas positioning
   * @default "fixed"
   */
  position?: "fixed" | "absolute" | "relative";
  /**
   * Z-index for layering
   * @default 0
   */
  zIndex?: number;
  /** Additional CSS classes for container */
  className?: string;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_PALETTE = [
  "rgb(0 95 115)",
  "rgb(10 147 150)",
  "rgb(148 210 189)",
  "rgb(233 216 166)",
  "rgb(238 155 0)",
  "rgb(202 103 2)",
  "rgb(187 62 3)",
  "rgb(174 32 18)",
  "rgb(155 34 38)",
];

// =============================================================================
// Component
// =============================================================================

/**
 * WaveAnimation - Animated wave bars background
 *
 * @example
 * ```tsx
 * // Basic usage
 * <WaveAnimation />
 *
 * // Custom colors and speed
 * <WaveAnimation
 *   palette={["hsl(var(--primary))", "var(--brand-accent)", "var(--brand-tertiary)"]}
 *   speed={1.5}
 *   barCount={30}
 * />
 *
 * // As section background
 * <div className="relative">
 *   <WaveAnimation position="absolute" zIndex={-1} />
 *   <Content />
 * </div>
 * ```
 */
export function WaveAnimation({
  palette = DEFAULT_PALETTE,
  barCount = 20,
  barWidth = 100,
  speed = 1,
  trailOpacity = 0.03,
  amplitude = 1,
  paused = false,
  position = "fixed",
  zIndex = 0,
  className,
}: WaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const animationRef = useRef<number | undefined>(undefined);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to full window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const startTime = Date.now();

    const animate = () => {
      if (pausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const time = (Date.now() - startTime) * speed;

      // Semi-transparent overlay for trailing effect
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create wave bars
      let x = 0;
      for (let i = 0; i < barCount; i++) {
        const waveHeight = 2 - (Math.sin(i + time / 200) / 2) * canvas.height * amplitude;

        ctx.fillStyle = palette[Math.floor(i + time / 200) % palette.length] ?? "rgb(0 0 0)";
        ctx.fillRect(x, canvas.height / 2, barWidth, waveHeight);
        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [palette, barCount, barWidth, speed, trailOpacity, amplitude]);

  return (
    <div className={cn("inset-0 h-full w-full", className)} style={{ position, zIndex }}>
      <canvas
        ref={canvasRef}
        className="block"
        style={{
          margin: 0,
          padding: 0,
          display: "block",
        }}
      />
    </div>
  );
}

export default WaveAnimation;

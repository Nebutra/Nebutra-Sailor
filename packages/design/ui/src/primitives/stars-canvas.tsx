"use client";

import { useEffect, useRef } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for StarsCanvas component
 *
 * @description
 * An animated canvas-based starfield background with orbiting, twinkling stars.
 * Uses HTML5 Canvas for performant rendering of many particles.
 *
 * **UX Scenarios:**
 * - Hero section backgrounds for tech/space themed sites
 * - Loading screens with ambient animation
 * - Dashboard backgrounds for data/analytics platforms
 * - Landing page atmospheric effects
 * - Night mode decorative backgrounds
 *
 * **Performance Notes:**
 * - Uses requestAnimationFrame for smooth 60fps animation
 * - Cached gradient texture for efficient star rendering
 * - Supports pause/resume for resource management
 * - Auto-resizes with window
 */
export interface StarsCanvasProps {
  /**
   * Whether background should be transparent
   * @default false
   */
  transparent?: boolean;
  /**
   * Total number of stars to render
   * @default 1200
   */
  maxStars?: number;
  /**
   * Color hue for stars (0-360)
   * @default 217 (blue)
   */
  hue?: number;
  /**
   * Overall star brightness multiplier (0-1)
   * @default 1
   */
  brightness?: number;
  /**
   * Global animation speed multiplier
   * @default 1
   */
  speedMultiplier?: number;
  /**
   * Twinkle frequency - lower = more twinkling
   * @default 20
   */
  twinkleIntensity?: number;
  /**
   * Whether animation is paused
   * @default false
   */
  paused?: boolean;
  /** Additional CSS classes */
  className?: string;
  /**
   * Canvas positioning style
   * @default "fixed"
   */
  position?: "fixed" | "absolute" | "relative";
  /**
   * Z-index for layering
   * @default -1
   */
  zIndex?: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * StarsCanvas - Animated starfield background
 *
 * @example
 * ```tsx
 * // Basic usage as page background
 * <StarsCanvas />
 *
 * // Customized starfield
 * <StarsCanvas
 *   maxStars={800}
 *   hue={280}
 *   brightness={0.8}
 *   speedMultiplier={0.5}
 *   transparent
 * />
 *
 * // With pause control
 * const [paused, setPaused] = useState(false);
 * <StarsCanvas paused={paused} />
 * ```
 */
export function StarsCanvas({
  transparent = false,
  maxStars = 1200,
  hue = 217,
  brightness = 1,
  speedMultiplier = 1,
  twinkleIntensity = 20,
  paused = false,
  className,
  position = "fixed",
  zIndex = -1,
}: StarsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const pausedRef = useRef(paused);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let h = (canvas.height = canvas.offsetHeight || window.innerHeight);

    // Star storage
    const stars: Star[] = [];

    // --- Cached gradient texture ---
    const canvas2 = document.createElement("canvas");
    const ctx2 = canvas2.getContext("2d");
    if (!ctx2) return;

    canvas2.width = 100;
    canvas2.height = 100;
    const half = canvas2.width / 2;
    const gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
    gradient2.addColorStop(0.025, "#fff");
    gradient2.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
    gradient2.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
    gradient2.addColorStop(1, "transparent");
    ctx2.fillStyle = gradient2;
    ctx2.beginPath();
    ctx2.arc(half, half, half, 0, Math.PI * 2);
    ctx2.fill();

    // --- Utility functions ---
    const random = (min: number, max?: number): number => {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      if (min > max) [min, max] = [max, min];
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const maxOrbit = (x: number, y: number): number => {
      const max = Math.max(x, y);
      const diameter = Math.round(Math.sqrt(max * max + max * max));
      return diameter / 2;
    };

    // --- Star class ---
    class Star {
      orbitRadius: number;
      radius: number;
      orbitX: number;
      orbitY: number;
      timePassed: number;
      speed: number;
      alpha: number;

      constructor() {
        this.orbitRadius = random(maxOrbit(w, h));
        this.radius = random(60, this.orbitRadius) / 12;
        this.orbitX = w / 2;
        this.orbitY = h / 2;
        this.timePassed = random(0, maxStars);
        this.speed = (random(this.orbitRadius) / 50000) * speedMultiplier;
        this.alpha = (random(2, 10) / 10) * Math.min(brightness, 1);
      }

      draw() {
        const x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX;
        const y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY;
        const twinkle = random(twinkleIntensity);

        if (twinkle === 1 && this.alpha > 0) {
          this.alpha -= 0.05;
        } else if (twinkle === 2 && this.alpha < 1) {
          this.alpha += 0.05;
        }

        if (ctx) ctx.globalAlpha = this.alpha;
        ctx?.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius);
        this.timePassed += this.speed;
      }
    }

    // Initialize stars
    for (let i = 0; i < maxStars; i++) {
      stars.push(new Star());
    }

    // --- Animation loop ---
    const animate = () => {
      if (pausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = transparent ? `hsla(${hue}, 64%, 6%, 0)` : `hsla(${hue}, 64%, 6%, 1)`;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const star of stars) {
        star.draw();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // --- Resize handling ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas) {
          w = canvas.width = entry.contentRect.width;
          h = canvas.height = entry.contentRect.height;

          // Update star orbit centers
          for (const star of stars) {
            star.orbitX = w / 2;
            star.orbitY = h / 2;
          }
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [transparent, maxStars, hue, brightness, speedMultiplier, twinkleIntensity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("top-0 left-0 h-full w-full", className)}
      style={{
        display: "block",
        position,
        zIndex,
      }}
    />
  );
}

export default StarsCanvas;

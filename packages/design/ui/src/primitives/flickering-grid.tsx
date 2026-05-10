"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for FlickeringGrid component
 *
 * @description
 * A canvas-based flickering grid background with randomly changing opacity squares.
 * Creates a subtle, animated tech-aesthetic background effect.
 *
 * **UX Scenarios:**
 * - Hero section backgrounds
 * - Card/panel decorative backgrounds
 * - Loading state ambient animation
 * - Dashboard backgrounds
 * - Tech/data visualization aesthetics
 *
 * **Performance:**
 * - Uses Canvas for efficient rendering
 * - IntersectionObserver pauses when offscreen
 * - ResizeObserver for responsive sizing
 * - DPR-aware for sharp rendering
 */
export interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of each square in pixels
   * @default 4
   */
  squareSize?: number;
  /**
   * Gap between squares in pixels
   * @default 6
   */
  gridGap?: number;
  /**
   * Probability of a square flickering per second (0-1)
   * @default 0.3
   */
  flickerChance?: number;
  /**
   * Color of the squares (any CSS color)
   * @default "rgb(0, 0, 0)"
   */
  color?: string;
  /**
   * Fixed width (auto if not specified)
   */
  width?: number;
  /**
   * Fixed height (auto if not specified)
   */
  height?: number;
  /**
   * Maximum opacity of the squares
   * @default 0.3
   */
  maxOpacity?: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * FlickeringGrid - Animated flickering grid background
 *
 * @example
 * ```tsx
 * // Basic usage as background
 * <div className="relative h-[400px]">
 *   <FlickeringGrid className="absolute inset-0" />
 *   <Content />
 * </div>
 *
 * // Custom colors and density
 * <FlickeringGrid
 *   color="rgb(59, 130, 246)"
 *   squareSize={6}
 *   gridGap={4}
 *   flickerChance={0.5}
 *   maxOpacity={0.4}
 * />
 *
 * // Rounded container
 * <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
 *   <FlickeringGrid />
 * </div>
 * ```
 */
export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Convert color to RGBA prefix
  const memoizedColor = useMemo(() => {
    const toRGBA = (colorStr: string): string => {
      if (typeof window === "undefined") {
        return `rgba(0, 0, 0,`;
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "rgba(0, 0, 0,";
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r}, ${g}, ${b},`;
    };
    return toRGBA(color);
  }, [color]);

  // Setup canvas and initialize grid
  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, w: number, h: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const cols = Math.floor(w / (squareSize + gridGap));
      const rows = Math.floor(h / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);

      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity],
  );

  // Update square opacities
  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  // Draw the grid
  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ) => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr,
          );
        }
      }
    },
    [memoizedColor, squareSize, gridGap],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      updateSquares(gridParams.squares, deltaTime);
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr,
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setIsInView(entries[0].isIntersecting);
        }
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div ref={containerRef} className={cn("h-full w-full", className)} {...props}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  );
};

export default FlickeringGrid;

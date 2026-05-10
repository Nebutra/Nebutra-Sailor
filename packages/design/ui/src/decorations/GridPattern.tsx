"use client";

import * as React from "react";
import { cn } from "../utils/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * GridPattern Component
 *
 * A decorative SVG grid background pattern.
 *
 * Usage:
 * <GridPattern /> // Default grid
 * <GridPattern variant="dots" /> // Dot pattern
 * <GridPattern fade="top" /> // Fade from top
 * ───────────────────────────────────────────────────────────────────────────── */

export interface GridPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "lines" | "dots" | "crosses";
  size?: number;
  strokeWidth?: number;
  fade?: "none" | "top" | "bottom" | "both" | "radial";
  color?: string;
}

export const GridPattern = React.forwardRef<HTMLDivElement, GridPatternProps>(
  (
    {
      className,
      variant = "lines",
      size = 32,
      strokeWidth = 1,
      fade = "none",
      color = "currentColor",
      ...props
    },
    ref,
  ) => {
    const patternId = React.useId();
    const maskId = React.useId();

    const renderPattern = () => {
      switch (variant) {
        case "dots":
          return <circle cx={size / 2} cy={size / 2} r={strokeWidth} fill={color} />;
        case "crosses": {
          const crossSize = 6;
          const cx = size / 2;
          const cy = size / 2;
          return (
            <>
              <line
                x1={cx - crossSize / 2}
                y1={cy}
                x2={cx + crossSize / 2}
                y2={cy}
                stroke={color}
                strokeWidth={strokeWidth}
              />
              <line
                x1={cx}
                y1={cy - crossSize / 2}
                x2={cx}
                y2={cy + crossSize / 2}
                stroke={color}
                strokeWidth={strokeWidth}
              />
            </>
          );
        }
        default:
          return (
            <path
              d={`M ${size} 0 L 0 0 0 ${size}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
      }
    };

    const getMaskGradient = () => {
      switch (fade) {
        case "top":
          return (
            <linearGradient id={maskId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="1" />
            </linearGradient>
          );
        case "bottom":
          return (
            <linearGradient id={maskId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          );
        case "both":
          return (
            <linearGradient id={maskId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          );
        case "radial":
          return (
            <radialGradient id={maskId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          );
        default:
          return null;
      }
    };

    const maskGradient = getMaskGradient();

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden text-border/40",
          className,
        )}
        aria-hidden="true"
        {...props}
      >
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
          <defs>
            <pattern
              id={patternId}
              x="0"
              y="0"
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
            >
              {renderPattern()}
            </pattern>
            {maskGradient}
          </defs>

          {fade !== "none" ? (
            <>
              <mask id={`${maskId}-mask`}>
                <rect width="100%" height="100%" fill={`url(#${maskId})`} />
              </mask>
              <rect
                width="100%"
                height="100%"
                fill={`url(#${patternId})`}
                mask={`url(#${maskId}-mask)`}
              />
            </>
          ) : (
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          )}
        </svg>
      </div>
    );
  },
);
GridPattern.displayName = "GridPattern";

"use client";
import * as React from "react";
import { cn } from "../utils/cn";
// =============================================================================
// Types
// =============================================================================
export interface GaugeColorStop {
  /** Value threshold (0–100). The stop applies when value >= this threshold. */
  value: number;
  /** CSS color string */
  color: string;
}
export interface GaugeProps {
  /** Current value, 0–100 */
  value?: number;
  /** Diameter in pixels */
  size?: number;
  /** Stroke width in pixels (default: auto-scaled ~10% of size) */
  strokeWidth?: number;
  /**
   * Show a center label.
   * - `true` → renders the numeric value with a "%" suffix
   * - `ReactNode` → renders custom content
   */
  label?: boolean | React.ReactNode;
  /**
   * Custom color stops — sorted ascending by `value`.
   * The highest stop whose `value` ≤ current value is used.
   * If omitted, the default rainbow scale is used.
   */
  colors?: GaugeColorStop[];
  /** Color of the background (track) arc. Defaults to the muted token. */
  secondaryColor?: string;
  /**
   * Which arc renders on top when both overlap.
   * - `"value"` (default) — value arc on top
   * - `"secondary"` — track arc on top
   */
  arcPriority?: "value" | "secondary";
  /** When true, shows a spinning animation (value is ignored) */
  indeterminate?: boolean;
  /** Additional CSS classes on the root `<div>` */
  className?: string;
}
// =============================================================================
// Default color scale
// =============================================================================
const DEFAULT_COLOR_STOPS: GaugeColorStop[] = [
  { value: 0, color: "hsl(220 9% 46%)" }, // muted gray
  { value: 40, color: "hsl(38 92% 50%)" }, // amber
  { value: 75, color: "hsl(142 71% 45%)" }, // emerald
];
function resolveColor(value: number, stops: GaugeColorStop[]): string {
  const sorted = [...stops].sort((a, b) => a.value - b.value);
  let color = sorted[0]?.color ?? "currentColor";
  for (const stop of sorted) {
    if (value >= stop.value) color = stop.color;
  }
  return color;
}
// =============================================================================
// Gauge
// =============================================================================
/**
 * Gauge — a circular visual for conveying a percentage.
 *
 * @example
 * <Gauge value={72} size={64} label />
 *
 * @example
 * // Custom color range
 * <Gauge
 *   value={50}
 *   colors={[
 *     { value: 0,  color: "#ef4444" },
 *     { value: 50, color: "#f59e0b" },
 *     { value: 80, color: "#22c55e" },
 *   ]}
 * />
 */
export const Gauge = React.forwardRef<HTMLDivElement, GaugeProps>(
  (
    {
      value = 0,
      size = 48,
      strokeWidth,
      label,
      colors,
      secondaryColor,
      arcPriority = "value",
      indeterminate = false,
      className,
    },
    ref,
  ) => {
    const sw = strokeWidth ?? Math.max(3, Math.round(size * 0.1));
    const radius = (size - sw) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedValue = Math.min(100, Math.max(0, value));
    const offset = circumference * (1 - clampedValue / 100);
    const activeColor = resolveColor(clampedValue, colors ?? DEFAULT_COLOR_STOPS);
    const trackColor = secondaryColor ?? "color-mix(in oklch, currentColor 15%, transparent)";
    // The SVG circle that draws the colored arc
    const valueArc = (
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={activeColor}
        strokeWidth={sw}
        strokeDasharray={circumference}
        strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={
          indeterminate
            ? { transformOrigin: "center", animation: "gauge-spin 1.2s linear infinite" }
            : { transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease" }
        }
      />
    );
    const trackArc = (
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={sw}
      />
    );
    // Resolve label content
    let labelNode: React.ReactNode = null;
    if (label === true) {
      labelNode = (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(8, Math.round(size * 0.24))}
          fontWeight="500"
          fill="currentColor"
        >
          {indeterminate ? "…" : `${Math.round(clampedValue)}`}
        </text>
      );
    } else if (label !== false && label != null) {
      // Custom ReactNode label — rendered as foreign object
      labelNode = null; // handled via absolute overlay below
    }
    const customLabel = label !== true && label !== false && label != null ? label : null;
    return (
      // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
      <div
        ref={ref}
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        role="meter"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={indeterminate ? "Loading" : `${Math.round(clampedValue)}%`}
      >
        {/* Inject keyframe animation once */}
        <style>{`
          @keyframes gauge-spin {
            from { transform: rotate(-90deg); }
            to   { transform: rotate(270deg); }
          }
        `}</style>
        <svg
          aria-hidden="true"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          overflow="visible"
        >
          {arcPriority === "value" ? (
            <>
              {trackArc}
              {valueArc}
            </>
          ) : (
            <>
              {valueArc}
              {trackArc}
            </>
          )}
          {labelNode}
        </svg>
        {/* Custom label overlay */}
        {customLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {customLabel}
          </div>
        )}
      </div>
    );
  },
);
Gauge.displayName = "Gauge";

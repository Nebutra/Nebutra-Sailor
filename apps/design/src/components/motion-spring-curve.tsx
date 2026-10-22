/**
 * A spring's response curve as an SVG.
 *
 * No hooks and no browser APIs, so the token page renders it on the server and
 * the Lab tuner re-renders it on every slider tick. The dashed line is the
 * target; a curve that rises above it is a spring that overshoots. An optional
 * marker rides the curve, which is how the Lab shows where an animation is.
 */

import { type SpringParams, springCurve, springValue } from "@/lib/motion/spring";

export function SpringCurveSvg({
  params,
  label,
  width = 320,
  height = 144,
  padding = 14,
  markerMs,
  className = "",
}: {
  params: SpringParams;
  /** Accessible name; the curve is also described by the numbers beside it. */
  label: string;
  width?: number;
  height?: number;
  padding?: number;
  /** Draws a dot on the curve at this time. */
  markerMs?: number;
  className?: string;
}) {
  const curve = springCurve(params, { width, height, padding });
  const marker =
    markerMs === undefined
      ? null
      : (() => {
          const t = Math.min(Math.max(markerMs, 0), curve.durationMs);
          const x = curve.x0 + (t / curve.durationMs) * (curve.x1 - curve.x0);
          const value = springValue(params, t / 1000);
          const y = curve.zeroY - value * (curve.zeroY - curve.targetY);
          return { x, y };
        })();

  return (
    <svg
      aria-label={label}
      className={`block h-auto w-full ${className}`}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>{label}</title>
      <line
        className="stroke-border"
        strokeDasharray="3 4"
        x1={curve.x0}
        x2={curve.x1}
        y1={curve.targetY}
        y2={curve.targetY}
      />
      <line
        className="stroke-border"
        x1={curve.x0}
        x2={curve.x1}
        y1={curve.zeroY}
        y2={curve.zeroY}
      />
      <path
        className="stroke-primary"
        d={curve.d}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      {marker ? <circle className="fill-primary" cx={marker.x} cy={marker.y} r={4} /> : null}
    </svg>
  );
}

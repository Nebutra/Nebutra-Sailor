"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "@/shared/motion";

/** Spline curve builder */
function generatePath(points: number[], width: number, height: number, max: number) {
  if (points.length === 0) return "";
  const stepX = width / (points.length - 1);
  const scaleY = height / max;

  let pathData = `M 0 ${height - points[0] * scaleY}`;

  for (let i = 0; i < points.length - 1; i++) {
    const x0 = i * stepX;
    const y0 = height - points[i] * scaleY;
    const x1 = (i + 1) * stepX;
    const y1 = height - points[i + 1] * scaleY;

    const mx = (x0 + x1) / 2;
    pathData += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return pathData;
}

export function LiveMetricsChart() {
  const shouldReduceMotion = useReducedMotion();
  const [data, setData] = useState<number[]>(() => Array.from({ length: 20 }, () => 100));

  useEffect(() => {
    // Reduced motion: freeze the chart — no continuous data churn / path morphing.
    if (shouldReduceMotion) return;
    const interval = setInterval(() => {
      setData((prev) => {
        const nextValue = Math.min(
          Math.max(prev[prev.length - 1] + (Math.random() * 40 - 15), 50),
          180,
        );
        return [...prev.slice(1), nextValue];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const width = 300;
  const height = 80;
  const path = generatePath(data, width, height, 200);

  return (
    <div className="relative w-full rounded-[var(--radius-xl)] border border-border/40 bg-background/50 p-4 shadow-elevation-high overflow-hidden">
      {/* No "Live" dot and no requests-per-second readout. The series is
          Math.random() walked between 50 and 180 and multiplied by 12.3; a
          pulsing green dot and a counter reading "2,214 Requests / sec" present
          that as traffic through somebody's production fleet. The shape of a
          telemetry stream is what this illustrates, and the shape is honest. */}
      <div className="relative z-10 mb-4">
        <h4 className="mb-1 font-bold text-[10px] text-muted-foreground/80 uppercase tracking-widest">
          Telemetry stream
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Usage events as they arrive, per tenant and per meter.
        </p>
      </div>

      <div className="relative h-[80px] w-full mt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full preserve-3d overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <motion.path
            d={`${path} L ${width} ${height} L 0 ${height} Z`}
            fill="url(#chartGlow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 1 }}
          />
          <motion.path
            d={path}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={
              shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 1.5, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))" }}
          />
        </svg>
      </div>
    </div>
  );
}

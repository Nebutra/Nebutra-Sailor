"use client";

import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

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
  const value = Math.floor(data[data.length - 1] * 12.3);

  return (
    <div className="relative w-full rounded-[var(--radius-xl)] border border-border/40 bg-background/50 dark:bg-zinc-950/50 p-4 shadow-elevation-high backdrop-blur-md overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--neutral-6)_1px,transparent_1px),linear-gradient(to_bottom,var(--neutral-6)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
            Realtime Traffic
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {!shouldReduceMotion && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              Live
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-semibold text-foreground font-mono"
            style={{ letterSpacing: "var(--tracking-tight)" }}
          >
            <NumberFlow value={value} trend={(prev, curr) => (curr > prev ? 1 : -1)} />
          </div>
          <p className="text-[10px] text-muted-foreground">Requests / sec</p>
        </div>
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

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { cn } from "../utils/cn";

export interface LightRaysProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
  /** Total number of animated rays */
  count?: number;
  /** Base colour used for the gradients */
  color?: string;
  /** Pixel radius applied to the blur filter */
  blur?: number;
  /** Average seconds each ray takes to complete a cycle */
  speed?: number;
  /** CSS length for the ray height */
  length?: string;
}

type LightRay = {
  id: string;
  left: number;
  rotate: number;
  width: number;
  swing: number;
  delay: number;
  duration: number;
  intensity: number;
};

const createRays = (count: number, cycle: number): LightRay[] => {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const left = 8 + Math.random() * 84;
    const rotate = -28 + Math.random() * 56;
    const width = 160 + Math.random() * 160;
    const swing = 0.8 + Math.random() * 1.8;
    const delay = Math.random() * cycle;
    const duration = cycle * (0.75 + Math.random() * 0.5);
    const intensity = 0.6 + Math.random() * 0.5;

    return {
      id: `${index}-${Math.round(left * 10)}`,
      left,
      rotate,
      width,
      swing,
      delay,
      duration,
      intensity,
    };
  });
};

const Ray = ({ left, rotate, width, swing, delay, duration, intensity }: LightRay) => {
  return (
    <motion.div
      className="pointer-events-none absolute -top-[12%] left-[var(--ray-left)] h-[var(--light-rays-length)] w-[var(--ray-width)] origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-[color-mix(in_srgb,var(--light-rays-color)_70%,transparent)] to-transparent opacity-0 mix-blend-screen blur-[var(--light-rays-blur)]"
      style={
        {
          "--ray-left": `${left}%`,
          "--ray-width": `${width}px`,
        } as any // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      initial={{ rotate: rotate }}
      animate={{
        opacity: [0, intensity, 0],
        rotate: [rotate - swing, rotate + swing, rotate - swing],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
        repeatDelay: duration * 0.1,
      }}
    />
  );
};

/**
 * LightRays - Animated light rays shining from above
 *
 * @description
 * Creates an atmospheric lighting effect with animated rays.
 * Perfect for hero sections, cards, or any container needing visual emphasis.
 *
 * @example Basic usage
 * ```tsx
 * <div className="relative h-[400px] w-full overflow-hidden rounded-[var(--radius-xl)] border">
 *   <LightRays />
 * </div>
 * ```
 *
 * @example Custom colors and count
 * ```tsx
 * <LightRays
 *   count={10}
 *   color="rgba(255, 200, 100, 0.3)"
 *   blur={48}
 *   speed={18}
 * />
 * ```
 */
export function LightRays({
  className,
  style,
  count = 7,
  color = "rgba(160, 210, 255, 0.2)",
  blur = 36,
  speed = 14,
  length = "70vh",
  ref,
  ...props
}: LightRaysProps) {
  const [rays, setRays] = useState<LightRay[]>([]);
  const cycleDuration = Math.max(speed, 0.1);

  useEffect(() => {
    setRays(createRays(count, cycleDuration));
  }, [count, cycleDuration]);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]",
        className,
      )}
      style={
        {
          "--light-rays-color": color,
          "--light-rays-blur": `${blur}px`,
          "--light-rays-length": length,
          ...style,
        } as any
      }
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={
            {
              background:
                "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--light-rays-color) 45%, transparent), transparent 70%)",
            } as any // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={
            {
              background:
                "radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--light-rays-color) 35%, transparent), transparent 75%)",
            } as any // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        />
        {rays.map((ray) => (
          <Ray key={ray.id} {...ray} />
        ))}
      </div>
    </div>
  );
}

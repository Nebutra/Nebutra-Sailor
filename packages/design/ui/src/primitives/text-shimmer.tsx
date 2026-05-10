"use client";
import { motion } from "framer-motion";
import { type JSX, useMemo } from "react";
import { cn } from "../utils";

export interface TextShimmerProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export function TextShimmer({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  // Memoize by Component so React doesn't see a new type on every render
  // (which would unmount/remount and reset the animation).
  const MotionComponent = useMemo(
    () =>
      motion.create
        ? motion.create(Component as keyof JSX.IntrinsicElements)
        : motion(Component as keyof JSX.IntrinsicElements),
    [Component],
  );

  const dynamicSpread = useMemo(() => children.length * spread, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text",
        "text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
        "[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        "dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
        } as any // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    >
      {children}
    </MotionComponent>
  );
}

export default TextShimmer;

"use client";

import { ArrowUpRight as MoveUpRight } from "@nebutra/icons";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface InteractiveFrostedGlassCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: "surface" | "elevated";
}

export function InteractiveFrostedGlassCard({
  title,
  description,
  icon,
  className = "",
  variant = "surface",
}: InteractiveFrostedGlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const isElevated = variant === "elevated";

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    const handlePointerEnter = () => setIsHovered(true);
    const handlePointerLeave = () => setIsHovered(false);

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerenter", handlePointerEnter);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerenter", handlePointerEnter);
      element.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const cardClasses = isElevated
    ? `group relative w-full overflow-hidden rounded-[var(--radius-3xl)] border border-cyan/25 bg-neutral-950/60 p-8 backdrop-blur-3xl transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-500 hover:border-cyan/40 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_60px_rgba(11,241,195,0.08)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(11,241,195,0.12)]`
    : `group relative w-full overflow-hidden rounded-[var(--radius-3xl)] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-500 hover:border-white/20 shadow-none hover:shadow-[0_4px_16px_rgba(255,255,255,0.05)]`;

  const glowColor = isElevated
    ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(11,241,195,0.15), transparent 40%)`
    : `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.06), transparent 40%)`;

  const iconBgClass = isElevated
    ? "flex h-12 w-12 items-center justify-center rounded-[var(--radius-2xl)] bg-cyan/10 text-cyan backdrop-blur-md border border-cyan/20 shadow-[0_0_20px_rgba(11,241,195,0.1)]"
    : "flex h-12 w-12 items-center justify-center rounded-[var(--radius-2xl)] bg-white/5 text-white/80 backdrop-blur-md border border-white/10";

  const noiseFilterId = `cardNoise_${variant}`;

  return (
    <div
      ref={cardRef}
      className={`${cardClasses} ${className}`}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${(mousePosition.y - 150) / 20}deg) rotateY(${-(mousePosition.x - 150) / 20}deg)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.1s ease-out, border 0.3s ease, box-shadow 0.5s ease",
      }}
    >
      {/* Elevated: top gradient accent line */}
      {isElevated && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      )}

      {/* Noise Texture */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 mix-blend-overlay ${isElevated ? "opacity-15" : "opacity-10"}`}
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
        >
          <filter id={noiseFilterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${noiseFilterId})`} />
        </svg>
      </div>

      {/* Mouse Follow Glow */}
      <div
        className="pointer-events-none absolute -inset-px z-0 rounded-[var(--radius-3xl)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glowColor }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between gap-y-8">
        <div className="flex items-start justify-between">
          <div className={iconBgClass}>{icon}</div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300 ${isElevated ? "bg-cyan/5 text-cyan/50 group-hover:bg-cyan/20 group-hover:text-cyan" : "bg-white/5 text-white/30 group-hover:bg-white/10 group-hover:text-white/60"}`}
          >
            <MoveUpRight className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </div>

        <div>
          <h3
            className={`mb-2 text-2xl font-semibold tracking-tight ${isElevated ? "text-white" : "text-white/90"}`}
          >
            {title}
          </h3>
          <p
            className={`text-sm font-medium leading-relaxed ${isElevated ? "text-white/50" : "text-white/40"}`}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

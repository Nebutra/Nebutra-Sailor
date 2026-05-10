"use client";

import { useEffect } from "react";
import { cn } from "../utils/cn";

/**
 * Globe animation keyframes
 * Injected into document head via useEffect
 */
const GLOBE_STYLE_ID = "nebutra-globe-keyframes";
const globeStyles = `
@keyframes nebutra-globe-flow {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -100;
  }
}
`;

/**
 * Hook to inject globe styles into document head
 */
function useGlobeStyles() {
  useEffect(() => {
    if (typeof document !== "undefined" && !document.getElementById(GLOBE_STYLE_ID)) {
      const styleEl = document.createElement("style");
      styleEl.id = GLOBE_STYLE_ID;
      styleEl.textContent = globeStyles;
      document.head.appendChild(styleEl);
    }
  }, []);
}

export interface GlobeProps {
  /** Optional CSS class name */
  className?: string;
  /** Headline text */
  headline?: string;
  /** Description text */
  description?: string;
}

/**
 * Globe - Animated globe illustration with performance messaging
 *
 * @example
 * ```tsx
 * <Globe
 *   headline="Top-level performance"
 *   description="Made for static sites while avoiding heavy assets."
 * />
 * ```
 */
export function Globe({
  className,
  headline = "Top-level performance",
  description = "Made for static sites while avoiding heavy assets, your website will feel snappy and load instantly.",
}: GlobeProps) {
  useGlobeStyles();

  return (
    <div
      className={cn(
        "relative w-full max-w-5xl mx-auto overflow-hidden rounded-[var(--radius-3xl)] p-8 md:p-12 border backdrop-blur",
        // Light mode
        "bg-white/90 border-neutral-200 text-black",
        // Dark mode
        "dark:bg-neutral-900/90 dark:border-neutral-800 dark:text-white",
        className,
      )}
    >
      {/* Ambient glow (adapts) */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/20" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/20" />

      <div className="relative flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">{headline}</h2>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          {description}
        </p>

        {/* Globe illustration */}
        <div className="mt-10 h-64 w-64 md:h-80 md:w-80 overflow-hidden">
          <svg
            viewBox="0 0 300 300"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              {/* Glow hub - adaptive to theme */}
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(34,211,238,0.9)" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.1)" />
              </radialGradient>
              {/* Line trail gradients - dark mode */}
              <linearGradient id="trailBright" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="trailDim" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
              </linearGradient>
              {/* Light mode gradients */}
              <linearGradient id="trailBrightLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="trailDimLight" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Enhanced globe group */}
            <g>
              {/* Latitude lines */}
              {[...Array(6)].map((_, i) => (
                <ellipse
                  key={`lat-${i}`}
                  cx="150"
                  cy="150"
                  rx={120}
                  ry={40 + i * 12}
                  stroke="url(#trailDim)"
                  strokeWidth="1.2"
                  fill="none"
                  strokeDasharray="5 5"
                  style={{
                    animation: "nebutra-globe-flow 10s linear infinite",
                  }}
                  opacity={0.8}
                  transform="rotate(-25,150,150)"
                  className="dark:stroke-[url(#trailDim)] stroke-[url(#trailDimLight)]"
                />
              ))}

              {/* Longitude lines */}
              {[...Array(8)].map((_, i) => (
                <path
                  key={`lon-${i}`}
                  d="M150,30 A120,120 0 0,1 150,270"
                  stroke="url(#trailDim)"
                  strokeWidth="1.2"
                  fill="none"
                  strokeDasharray="4 4"
                  style={{
                    animation: "nebutra-globe-flow 12s linear infinite reverse",
                  }}
                  opacity={0.8}
                  transform={`rotate(${i * 22.5},150,150)`}
                  className="dark:stroke-[url(#trailDim)] stroke-[url(#trailDimLight)]"
                />
              ))}

              {/* Orbital trails */}
              <ellipse
                cx="150"
                cy="150"
                rx="140"
                ry="60"
                stroke="url(#trailBright)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="10 10"
                style={{
                  animation: "nebutra-globe-flow 14s linear infinite",
                }}
                opacity="1"
                transform="rotate(20,150,150)"
                className="dark:stroke-[url(#trailBright)] stroke-[url(#trailBrightLight)]"
              />
              <ellipse
                cx="150"
                cy="150"
                rx="130"
                ry="50"
                stroke="url(#trailDim)"
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="12 12"
                style={{
                  animation: "nebutra-globe-flow 9s linear infinite reverse",
                }}
                opacity="0.9"
                transform="rotate(-40,150,150)"
                className="dark:stroke-[url(#trailDim)] stroke-[url(#trailDimLight)]"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export type { GlobeProps as GlobeComponentProps };

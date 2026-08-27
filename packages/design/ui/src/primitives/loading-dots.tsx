"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface LoadingDotsProps {
  ref?: React.Ref<HTMLSpanElement> | undefined;
  /** Diameter of each dot in pixels. Default: 6 */
  size?: number;
  /** Optional content rendered before the dots (e.g. a label). */
  children?: React.ReactNode;
  className?: string;
}

// =============================================================================
// Animation keyframe — inline <style> so the registry-distributed copy ships
// self-contained (no tailwind.config or globals.css edit required on the
// consumer side). Wrapped in `prefers-reduced-motion: no-preference` to honor
// Geist's a11y rule — users with reduced motion see static dots.
// =============================================================================

const KEYFRAMES = `
@keyframes loading-dot {
  0%, 100% { opacity: 0.25; transform: scale(0.75); }
  50%       { opacity: 1;    transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .nbt-loading-dot { animation: none !important; opacity: 0.6; }
}
`;

const loadingDotDelayMultipliers = [0, 1, 2] as const;

// =============================================================================
// LoadingDots
// =============================================================================

function LoadingDots({ ref, size = 6, children, className }: LoadingDotsProps) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <span
        ref={ref}
        // Geist a11y rule: announce the in-progress label politely so the
        // surrounding text ("Saving"/"Building") reaches AT users without
        // interrupting their current speech.
        aria-live="polite"
        className={cn("inline-flex items-center gap-1", className)}
      >
        {children}
        <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
          {loadingDotDelayMultipliers.map((delayMultiplier) => (
            <span
              key={delayMultiplier}
              className="nbt-loading-dot rounded-full bg-current"
              style={{
                width: size,
                height: size,
                animation: "loading-dot var(--duration-cinematic) var(--ease-in-out) infinite",
                animationDelay: `calc(var(--duration-flow) * ${delayMultiplier})`,
              }}
            />
          ))}
        </span>
      </span>
    </>
  );
}

export { LoadingDots };

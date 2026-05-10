"use client";

import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface LoadingDotsProps {
  /** Diameter of each dot in pixels. Default: 6 */
  size?: number;
  /** Optional content rendered before the dots (e.g. a label). */
  children?: React.ReactNode;
  className?: string;
}

// =============================================================================
// Animation keyframe — injected once via <style>
// =============================================================================

const KEYFRAMES = `
@keyframes loading-dot {
  0%, 100% { opacity: 0.25; transform: scale(0.75); }
  50%       { opacity: 1;    transform: scale(1); }
}
`;

// =============================================================================
// LoadingDots
// =============================================================================

const LoadingDots = React.forwardRef<HTMLSpanElement, LoadingDotsProps>(
  ({ size = 6, children, className }, ref) => {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <span ref={ref} className={cn("inline-flex items-center gap-1", className)}>
          {children}
          <span className="inline-flex items-center gap-[3px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="rounded-full bg-current"
                style={{
                  width: size,
                  height: size,
                  animation: `loading-dot 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </span>
        </span>
      </>
    );
  },
);
LoadingDots.displayName = "LoadingDots";

export { LoadingDots };

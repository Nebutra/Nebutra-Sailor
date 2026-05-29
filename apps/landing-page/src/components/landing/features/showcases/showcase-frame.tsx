import type { ReactNode } from "react";

export type ShowcaseFrameProps = {
  children: ReactNode;
  /** Min-height in pixels for the outer frame (default 400). */
  minHeight?: number;
  /** Optional className appended to the outer container. */
  className?: string;
};

/**
 * Shared outer frame for all feature showcases. Provides the consistent
 * card chrome — rounded panel, calibrated surface, internal padding,
 * minimum height. Showcase content lives inside.
 */
export function ShowcaseFrame({ children, minHeight = 400, className }: ShowcaseFrameProps) {
  return (
    <div
      className={`landing-showcase-surface relative w-full overflow-hidden rounded-[var(--radius-panel)] border p-5 md:p-6 ${className ?? ""}`.trim()}
      style={{ minHeight: `${minHeight}px` }}
    >
      {children}
    </div>
  );
}

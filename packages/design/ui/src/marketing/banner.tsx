"use client";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Decorative grid pattern background - artistic exemption
 */
function Grid({
  cellSize = 12,
  strokeWidth = 1,
  patternOffset = [0, 0],
  className,
}: {
  cellSize?: number;
  strokeWidth?: number;
  patternOffset?: [number, number];
  className?: string;
}) {
  const id = React.useId();
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 text-foreground/10", className)}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#grid-${id})`} width="100%" height="100%" />
    </svg>
  );
}
export interface BannerProps {
  /** Whether the banner is visible */
  show: boolean;
  /** Callback when banner is dismissed */
  onHide: () => void;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Banner title/message content */
  title: React.ReactNode;
  /** Primary action button config */
  action: {
    label: string;
    onClick: () => void;
  };
  /** Optional learn more URL */
  learnMoreUrl?: string;
  /** Additional className */
  className?: string;
}
export function Banner({
  show,
  onHide,
  icon,
  title,
  action,
  learnMoreUrl,
  className,
}: BannerProps) {
  if (!show) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA pattern
    <div
      className={cn(
        "relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-emerald-600/15 bg-gradient-to-r from-lime-100/80 to-emerald-100/80 py-3 pl-4 pr-12 sm:flex-row sm:items-center sm:py-2 dark:from-emerald-950/50 dark:to-lime-950/50 dark:border-emerald-500/20",
        className,
      )}
      role="banner"
      aria-label="Promotional banner"
    >
      {/* Decorative grid - artistic exemption */}
      <Grid
        cellSize={13}
        patternOffset={[0, -1]}
        className="text-foreground/30 mix-blend-overlay [mask-image:linear-gradient(to_right,black,transparent)] md:[mask-image:linear-gradient(to_right,black_60%,transparent)]"
      />
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="hidden rounded-full border border-emerald-600/50 bg-background/50 p-1 shadow-[inset_0_0_1px_1px_rgba(255,255,255,0.5)] sm:block"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <p className="text-sm text-foreground">
          {title}
          {learnMoreUrl && (
            <>
              {" "}
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground underline transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-sm)]"
              >
                Learn more
              </a>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center sm:-my-1">
        <button
          type="button"
          className="whitespace-nowrap rounded-[var(--radius-md)] border border-emerald-700/50 px-3 py-1 text-sm text-foreground transition-colors hover:bg-emerald-500/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-emerald-500/50 dark:hover:bg-emerald-500/20"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      </div>
      <button
        type="button"
        className="absolute inset-y-0 right-2.5 p-1 text-sm text-emerald-700 transition-colors hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-sm)]"
        onClick={onHide}
        aria-label="Dismiss banner"
      >
        <X className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}

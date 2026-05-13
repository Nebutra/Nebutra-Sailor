"use client";

import type { ReactNode } from "react";
import { BrandMark } from "../primitives/brand-mark";
import { cn } from "../utils/cn";

type Tone = "default" | "branded" | "subtle";
type Size = "sm" | "md" | "lg";

export interface EmptyStateProps {
  /** Primary message — short, sentence case. */
  title: string;
  /** Supporting description — one sentence ideally. */
  description?: string;
  /** Visual anchor. When omitted and `tone="branded"`, a default `<BrandMark>` is rendered. */
  mascot?: ReactNode;
  /** Inline icon shown above the mascot/title for low-key states. Ignored when `mascot` is provided. */
  icon?: ReactNode;
  /** Primary call-to-action node (button, link). */
  action?: ReactNode;
  /** Secondary call-to-action (e.g. "Learn more"). */
  secondaryAction?: ReactNode;
  /**
   * Visual tone.
   * - `default`: neutral, no brand color (legacy default)
   * - `branded`: BrandMark + subtle gradient glow — use for first-touch / hero empty states
   * - `subtle`: minimal — for inline empty slots inside cards or tables
   */
  tone?: Tone;
  /** Size variant. */
  size?: Size;
  /** Extra classes for the root element. */
  className?: string;
}

const PADDING: Record<Size, string> = {
  sm: "px-4 py-8",
  md: "px-4 py-10",
  lg: "px-6 py-16",
};

const TITLE_SIZE: Record<Size, string> = {
  sm: "text-sm font-semibold",
  md: "text-lg font-semibold",
  lg: "text-xl font-semibold",
};

const DESC_SIZE: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * EmptyState — placeholder shown when a list, panel, or view has no content.
 *
 * Canonical single source — replaces the prior 3 duplicate implementations
 * (`primitives/empty-state.tsx` and `components/empty-state.tsx` have been
 * removed). All consumers import from `@nebutra/ui/layout`.
 *
 * Three tones express increasing visual weight:
 *
 * - `subtle` — flat, no chrome, for inline use inside cards/tables
 * - `default` — bordered, neutral icon, the legacy look
 * - `branded` — `<BrandMark>` mascot + soft brand halo, for first-touch
 *   surfaces (empty billing history, empty audit log, empty recents)
 *
 * @example
 * ```tsx
 * <EmptyState
 *   tone="branded"
 *   title="No history yet"
 *   description="Charges and invoices will appear here once you upgrade."
 *   action={<Button>Choose a plan</Button>}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  mascot,
  icon,
  action,
  secondaryAction,
  tone = "default",
  size = "md",
  className,
}: EmptyStateProps) {
  const showBrandMark = tone === "branded" && !mascot && !icon;

  return (
    <section
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl text-center",
        PADDING[size],
        tone === "default" &&
          "border border-dashed border-neutral-7 bg-neutral-1 dark:border-white/10 dark:bg-white/[0.02]",
        tone === "subtle" && "bg-transparent",
        tone === "branded" &&
          "border border-neutral-6 bg-gradient-to-b from-blue-2/40 to-transparent dark:border-white/10 dark:from-blue-2/10",
        className,
      )}
    >
      {tone === "branded" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--brand-gradient)" }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-4">
        {mascot ?? (showBrandMark ? <BrandMark size={size === "lg" ? "lg" : "md"} /> : null)}
        {icon && !mascot && !showBrandMark && (
          <div className="text-neutral-10 dark:text-white/60">{icon}</div>
        )}

        <div className="flex flex-col gap-1">
          <h3 className={cn(TITLE_SIZE[size], "text-neutral-12 dark:text-white")}>{title}</h3>
          {description && (
            <p
              className={cn(
                DESC_SIZE[size],
                "max-w-sm leading-relaxed text-neutral-11 dark:text-white/70",
              )}
            >
              {description}
            </p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </section>
  );
}

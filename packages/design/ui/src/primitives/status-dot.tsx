"use client";

import { forwardRef } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  StatusDot — deployment-lifecycle indicator.
 *
 *  Surface scope (per Geist guidance):
 *    Deployment lifecycle ONLY: QUEUED | BUILDING | READY | ERROR | CANCELED
 *    | DELETED. For non-deployment statuses (Workflow runs, Queue messages,
 *    Sandbox runs, Cron jobs) use a Badge with the canonical state
 *    vocabulary — don't repurpose the dot.
 *
 *  Behavior:
 *    - QUEUED + BUILDING animate (pulse); all terminal states stay static.
 *      Don't render an additional Spinner alongside.
 *    - The Best Practices say "don't flash colors through every transitional
 *      state on a polling tick" — that's a caller concern (only re-render
 *      when readyState actually changes upstream).
 *    - Pair with RelativeTimeCard when duration matters; the dot alone does
 *      not convey time.
 *
 *  Color isn't the only signal:
 *    Every state ships with a distinct `title` (full sentence) and `label`
 *    (single-word sentence-cased), so colorblind users get the same info.
 *
 *  A11y:
 *    - Default: composes `aria-label` from `titlePrefix` + the state message.
 *      Don't override with a generic `aria-label="status"` — that loses the
 *      state name.
 *    - When the dot sits next to text that already names the state, pass
 *      `decorative` so the dot becomes `aria-hidden` and screen readers
 *      don't announce the state twice.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// State catalog — token / title / sentence-cased label per Geist state
// ---------------------------------------------------------------------------

export type DeploymentState = "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | "DELETED";

type StateMeta = {
  /** Tailwind background utility for the dot. Uses semantic tokens. */
  dotBg: string;
  /** Full-sentence title for `title` + base `aria-label`. */
  title: string;
  /** Single-word sentence-cased label rendered when `label={true}`. */
  label: string;
};

const STATE_META: Readonly<Record<DeploymentState, StateMeta>> = {
  QUEUED: {
    dotBg: "bg-muted-foreground",
    title: "is queued.",
    label: "Queued",
  },
  BUILDING: {
    dotBg: "bg-warning",
    title: "is building.",
    label: "Building",
  },
  READY: {
    dotBg: "bg-success",
    title: "is ready.",
    label: "Ready",
  },
  ERROR: {
    dotBg: "bg-destructive",
    title: "had an error.",
    label: "Error",
  },
  CANCELED: {
    dotBg: "bg-muted-foreground/60",
    title: "was canceled.",
    label: "Canceled",
  },
  DELETED: {
    dotBg: "bg-muted-foreground/40",
    title: "was deleted.",
    label: "Deleted",
  },
};

const ANIMATED_STATES: ReadonlySet<DeploymentState> = new Set(["QUEUED", "BUILDING"]);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface StatusDotProps {
  /** Deployment lifecycle state. */
  state: DeploymentState;
  /** Render the sentence-cased state name next to the dot. */
  label?: boolean;
  /**
   * Noun phrase identifying the entity. Default `"This deployment"`. In lists
   * pass the entity (e.g. `"vercel-site production"`). Don't end with a verb
   * or punctuation — the title sentence is composed from this + the state.
   */
  titlePrefix?: string;
  /**
   * Mark the dot decorative when the surrounding text already names the state.
   * The dot becomes `aria-hidden` so screen readers don't announce twice.
   * @default false
   */
  decorative?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot(
  { state, label, titlePrefix = "This deployment", decorative = false, className },
  ref,
) {
  const meta = STATE_META[state];
  const title = `${titlePrefix} ${meta.title}`;
  const animated = ANIMATED_STATES.has(state);

  return (
    <span
      ref={ref}
      title={title}
      {...(decorative ? { "aria-hidden": "true" } : { "aria-label": title })}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          meta.dotBg,
          animated && "animate-pulse motion-reduce:animate-none",
        )}
      />
      {label && <span className="font-sans text-foreground text-sm leading-4">{meta.label}</span>}
    </span>
  );
});

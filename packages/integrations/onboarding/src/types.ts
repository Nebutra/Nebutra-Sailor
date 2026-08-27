/**
 * Public types for `@nebutra/onboarding`.
 *
 * `TourStep.target` is a CSS selector. Anchor it to elements with a
 * `data-tour-id="dashboard.command"` attribute so refactors that change
 * class names don't break the tour.
 */

export type TourSide = "top" | "right" | "bottom" | "left" | "over";
export type TourAlign = "start" | "center" | "end";

export interface TourStep {
  /** Stable id used in analytics + localStorage progress. */
  id: string;
  /** CSS selector for the anchor element. `[data-tour-id="..."]` recommended. */
  target: string;
  /** Popover title. */
  title: string;
  /** Popover body — plain text only (no markdown to keep bundle small). */
  description: string;
  /** Preferred popover side. */
  side?: TourSide;
  /** Alignment along the chosen side. */
  align?: TourAlign;
}

export interface Tour {
  /** Stable id used as the localStorage key suffix. */
  id: string;
  /** Display label for the tour (e.g. "Dashboard quickstart"). */
  label: string;
  /** Ordered steps. */
  steps: TourStep[];
  /** Optional CTA label override for the final step. Default: "Done". */
  doneLabel?: string;
}

export interface TourState {
  /** Currently running tour, or null if idle. */
  activeTour: Tour | null;
  /** Set of completed tour ids (read-only snapshot). */
  completed: ReadonlySet<string>;
}

export interface TourController {
  /** Start a tour (or restart if already completed). */
  start: (tour: Tour) => void;
  /** Programmatically advance — useful for "do X to continue" steps. */
  next: () => void;
  /** Go back one step. */
  previous: () => void;
  /** Abort the current tour without marking complete. */
  abort: () => void;
  /** Mark current tour completed and close. */
  complete: () => void;
  /** Check whether the user has completed a tour. */
  isCompleted: (tourId: string) => boolean;
  /** Clear completion state for a tour (used by "Restart tour"). */
  reset: (tourId: string) => void;
}

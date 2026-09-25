/**
 * Interaction contract — the timing and feel every product surface shares.
 *
 * One place for the numbers that make an interface feel deliberate rather than
 * merely animated. Each value is taken from a shipped, measured source rather
 * than tuned by eye; the source is named beside it so a change has to argue
 * with the evidence. Components read these; apps never restate them.
 *
 * Sources: sonner, vaul and Radix Tooltip source code; Vercel Web Interface
 * Guidelines; Emil Kowalski's animation guidance (author of sonner and vaul).
 */

export const interaction = {
  /**
   * Tooltips. The first one waits so a sweeping pointer does not strobe;
   * once one is open, its neighbours open instantly if the pointer arrives
   * within the skip window. Radix Tooltip defaults: delayDuration 700,
   * skipDelayDuration 300. Vercel/Kowalski: "delay the first tooltip only".
   */
  tooltip: { delayMs: 700, skipWindowMs: 300 },

  /**
   * Pending states. A spinner that flashes for 80ms reads as a glitch; one
   * that appears and vanishes in 200ms reads as jank. Show only after the
   * wait is noticeable, then keep it long enough to be read.
   * Vercel Web Interface Guidelines: show-delay ~150–300ms, minimum visible
   * ~300–500ms.
   */
  pending: { showDelayMs: 200, minVisibleMs: 400 },

  /**
   * Press feedback. A slight scale-down on :active, fast. Kowalski:
   * scale(0.97) at ~150ms. Never animate keyboard-initiated activation.
   */
  press: { scale: 0.97, durationMs: 150 },

  /**
   * Entering overlays start close to their final size, never from zero.
   * Kowalski: "never enter from scale(0)"; 0.9–0.95 reads as arrival.
   */
  enter: { fromScale: 0.96 },

  /**
   * Enter/exit asymmetry. Things arrive with a considered ease-out and leave
   * faster: the user already decided they are done. sonner: enter 300ms,
   * exit 200ms.
   */
  toast: { enterMs: 300, exitMs: 200, lifetimeMs: 4000, stackGapPx: 14 },

  /**
   * Sheets and drawers. vaul uses one curve for every drawer transition:
   * cubic-bezier(0.32, 0.72, 0, 1) over 500ms.
   */
  drawer: { ease: [0.32, 0.72, 0, 1] as const, durationMs: 500 },

  /**
   * Mutation latency budget. Past this, show optimistic state or progress.
   * Vercel Web Interface Guidelines: keep mutations under 500ms.
   */
  mutationBudgetMs: 500,
} as const;

export type Interaction = typeof interaction;

/**
 * The one pinned, scrubbed product story (founder motion spec), desktop only: the agent console
 * pins under the header and the scroll position drives the replay step, chapter by chapter
 * (ask → the agent reads and reaches → the chart answers → every step on the record). Scrolling
 * back reverses it; the scrubber buttons still take over at any time. Mobile, touch, short screens
 * and reduced motion get no pin: the chapters are tap-through steps instead.
 *
 * The pin is CSS `position: sticky` over a runway (home-agent.vue), so the compositor holds it in
 * place while scrolling: no main-thread pin switch, no pin-spacer reflow. Progress is read from
 * the runway's box at most once per frame, from a passive scroll listener that exists only while
 * the story is near the viewport. This replaced the GSAP scroll plugin, which keeps a
 * requestAnimationFrame loop running for the whole visit once registered (perf audit 2026-10-10:
 * 60–120 callbacks a second at rest, so a main-thread frame on every vsync).
 */

const STORY =
  "(min-width: 1024px) and (min-height: 720px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export interface AgentStory {
  revert(): void;
}

export interface AgentStoryOptions {
  /** The scroll distance the pin holds for, placed right after the pinned element. */
  runway(): HTMLElement | null | undefined;
  onEnable(active: boolean): void;
  onProgress(progress: number): void;
}

/** 0 when the pin starts, 1 once the runway has scrolled past (all in viewport pixels). */
export function storyProgress(pinTop: number, pinnedHeight: number, runwayTop: number, runwayHeight: number) {
  if (runwayHeight <= 0) return 1;
  return Math.min(1, Math.max(0, (pinTop + pinnedHeight - runwayTop) / runwayHeight));
}

export function createAgentStory(pinned: HTMLElement, options: AgentStoryOptions): AgentStory {
  const media = window.matchMedia(STORY);
  let stop: (() => void) | undefined;

  const start = () => {
    options.onEnable(true);
    let frame = 0;
    let listening = false;
    /** Report changes only (as the GSAP plugin's onUpdate did): a scroll before the pin starts
     *  must not reset a replay the visitor started with the play button. */
    let last = Number.NaN;
    const update = () => {
      frame = 0;
      const runway = options.runway();
      if (!runway) return;
      const pinTop = Number.parseFloat(getComputedStyle(pinned).top) || 0;
      const box = runway.getBoundingClientRect();
      const progress = storyProgress(pinTop, pinned.offsetHeight, box.top, box.height);
      if (progress === last) return;
      last = progress;
      options.onProgress(progress);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) window.addEventListener("scroll", schedule, { passive: true });
      else window.removeEventListener("scroll", schedule);
    };
    // Scroll work only while the story is within a screen of the viewport; the read on the way out
    // lands the step on the start or the end even after a fast fling.
    const near = new IntersectionObserver(
      ([entry]) => {
        listen(entry?.isIntersecting ?? false);
        schedule();
      },
      { rootMargin: "100% 0px" },
    );
    near.observe(pinned.parentElement ?? pinned);
    schedule();
    return () => {
      near.disconnect();
      listen(false);
      cancelAnimationFrame(frame);
      options.onEnable(false);
    };
  };

  const sync = () => {
    stop?.();
    stop = media.matches ? start() : undefined;
  };
  media.addEventListener("change", sync);
  sync();
  return {
    revert() {
      media.removeEventListener("change", sync);
      stop?.();
      stop = undefined;
    },
  };
}

/**
 * The one pinned, scrubbed product story (founder motion spec), desktop only: the agent console
 * sticks under the header while the chapter list beside it scrolls past, and the scroll position
 * drives the replay (the prompt is typed, then each call lands, chapter by chapter). Scrolling back
 * reverses it; the scrubber buttons still take over at any time. Mobile, touch, short screens and
 * reduced motion get no pin: the chapters are tap-through steps instead.
 *
 * The pin is CSS `position: sticky` inside the story track (home-agent.vue): the stage's bottom
 * margin (a fifth of a screen) is the pinned runway, and the story starts while the stage is still
 * rising into place, so the page carries no tall empty column. The compositor holds the console in place:
 * no main-thread pin switch, no pin-spacer reflow. Progress is read from the track's box at most
 * once per frame, from a passive scroll listener that exists only while the story is near the
 * viewport. This replaced the GSAP scroll plugin, which keeps a requestAnimationFrame loop running
 * for the whole visit once registered (perf audit 2026-10-10: 60–120 callbacks a second at rest).
 */

const STORY =
  "(min-width: 1024px) and (min-height: 720px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export interface AgentStory {
  revert(): void;
}

export interface AgentStoryOptions {
  /** The track the console sticks inside; its extra height over the console is the scroll distance. */
  track(): HTMLElement | null | undefined;
  onEnable(active: boolean): void;
  onProgress(progress: number): void;
}

/**
 * 0 when the track's top is `lead` px below the pin line, 1 when the pinned stage meets the track's
 * end (viewport px). The lead lets the story play while the stage rises into place, so the pinned
 * runway (the track's extra height) can stay short.
 */
export function storyProgress(
  pinTop: number,
  pinnedHeight: number,
  trackTop: number,
  trackHeight: number,
  lead = 0,
) {
  const distance = trackHeight - pinnedHeight + lead;
  if (distance <= 0) return 1;
  return Math.min(1, Math.max(0, (pinTop + lead - trackTop) / distance));
}

/** Where the story starts: the stage's top at 70% of the viewport, its window mostly in view. */
export const STORY_START = 0.7;

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
      const track = options.track();
      if (!track) return;
      const pinTop = Number.parseFloat(getComputedStyle(pinned).top) || 0;
      const box = track.getBoundingClientRect();
      const viewport = window.innerHeight;
      // Off screen the story rests finished, so a full-page capture, a jump link or a fast fling
      // past it never leaves a half-told window; it rewinds the moment its edge enters the view.
      const progress =
        box.bottom <= 0 || box.top >= viewport
          ? 1
          : storyProgress(pinTop, pinned.offsetHeight, box.top, box.height, Math.max(0, viewport * STORY_START - pinTop));
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

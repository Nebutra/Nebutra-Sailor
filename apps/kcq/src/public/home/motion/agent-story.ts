/**
 * The one pinned, scrubbed product story (founder motion spec), desktop only: the agent console
 * pins under the header and the scroll position drives the replay step, chapter by chapter
 * (ask → the agent reads and reaches → the chart answers → every step on the record). Scrolling
 * back reverses it; the scrubber buttons still take over at any time. Mobile, touch, short screens
 * and reduced motion get no pin: the chapters are tap-through steps instead.
 */
import { loadScrollTrigger } from "./gsap";

const STORY =
  "(min-width: 1024px) and (min-height: 720px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export interface AgentStory {
  revert(): void;
}

export async function createAgentStory(
  pinned: HTMLElement,
  options: { header: number; onEnable(active: boolean): void; onProgress(progress: number): void },
): Promise<AgentStory> {
  const { gsap, ScrollTrigger } = await loadScrollTrigger();
  const mm = gsap.matchMedia();
  mm.add(STORY, () => {
    options.onEnable(true);
    const trigger = ScrollTrigger.create({
      trigger: pinned,
      pin: true,
      start: () => `top ${options.header + 24}px`,
      end: () => `+=${Math.round(window.innerHeight * 1.4)}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => options.onProgress(self.progress),
    });
    options.onProgress(trigger.progress);
    return () => options.onEnable(false);
  });
  return { revert: () => mm.revert() };
}

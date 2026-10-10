/**
 * The hero's one timeline (founder motion spec: "ONE GSAP timeline, no scattered delays"):
 *
 *   H1 (masked reveal) → lede → actions   [only when it can run before first paint]
 *   ── (waits) until the live chart is ready ──
 *   product visual: chart fades in over the light field, field dims (or poster dims)
 *
 * The prerendered page shows text, CTA and the poster at first paint with no JS: nothing waits on
 * script at opacity 0. If the browser has already painted the text when hydration runs (the common
 * case), the text part is skipped instead of hiding painted content. The signature itself (the
 * candle glyph unfolding into live candles) is the field renderer's own WebGPU unfold, which this
 * timeline waits for. Reduced motion: no timeline; CSS shows the end state.
 */
import { EASE_OUT, loadGsap, MOTION_OK } from "./gsap";

export interface HeroTimelineTargets {
  heading: Element | null;
  lede: Element | null;
  actions: Element | null;
  chartHost: Element | null;
  field: Element | null;
  poster: Element | null;
}

export interface HeroTimeline {
  /** Resume at the product visual: the chart is mounted (and the field has unfolded, if on). */
  product(withField: boolean): void;
  revert(): void;
}

export async function createHeroTimeline(targets: () => HeroTimelineTargets): Promise<HeroTimeline> {
  const gsap = await loadGsap();
  let resume: ((withField: boolean) => void) | undefined;
  let pending: boolean | undefined;
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    const t = targets();
    const painted = performance.getEntriesByName("first-contentful-paint").length > 0;
    const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
    if (!painted && t.heading && t.lede && t.actions) {
      tl.from(t.heading, { clipPath: "inset(0 0 100% 0)", y: 24, duration: 0.6 })
        .from(t.lede, { y: 16, autoAlpha: 0, duration: 0.4 }, "-=0.42")
        .from(t.actions, { y: 16, autoAlpha: 0, duration: 0.4 }, "-=0.32");
    }
    // The product part is appended once the chart is ready, so it is still this one timeline, and
    // it knows whether the field or the poster is the ground to dim.
    resume = (withField) => {
      resume = undefined;
      const now = targets();
      const ground = withField ? now.field : now.poster;
      tl.addLabel("visual")
        .fromTo(now.chartHost, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, "visual")
        .fromTo(ground, { opacity: 1 }, { opacity: withField ? 0.45 : 0.35, duration: 0.5 }, "visual");
      tl.play();
    };
    if (pending !== undefined) resume(pending);
    return () => {
      resume = undefined;
    };
  });
  return {
    product(withField) {
      if (resume) resume(withField);
      else pending = withField;
    },
    revert() {
      mm.revert();
    },
  };
}

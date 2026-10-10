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

/**
 * Where the ground rests once the crisp chart is up (CSS end states in hero-chart.vue match). The
 * light stays a quiet glow, mostly desaturated, so it never tints the plot red or green under the
 * candles: candle-to-ground contrast stays within about 10% of the bare chart surface (measured on the plot: red ≥ 4.2:1, green ≥ 4.6:1, against 4.6 and 5.1 on the bare surface; the earlier 0.45 resting light gave 3.4 and 3.7).
 */
export const FIELD_REST = { opacity: 0.16, filter: "saturate(0.25)" } as const;
export const POSTER_REST = { opacity: 0.14 } as const;

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
        .fromTo(
          ground,
          withField ? { opacity: 1, filter: "saturate(1)" } : { opacity: 1 },
          { ...(withField ? FIELD_REST : POSTER_REST), duration: 0.5 },
          "visual",
        );
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

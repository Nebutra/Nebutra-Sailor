/**
 * The hero's choreography (ADR 2026-10-09 landing motion system §3, hero row), two owners, one
 * sequence, no element or property shared:
 *
 *   0–1000ms, CSS (home-hero.vue): H1 masked reveal → lede → actions → microcopy → chart frame
 *   ── when the live chart is ready (after load and idle, never on the first-paint path) ──
 *   this GSAP timeline: the crisp chart fades in over the light field, the field settles
 *
 * The entrance is CSS keyframes in the prerendered stylesheet, so it needs no script, starts with
 * the first frame (no flash of finished text, no hiding of painted text) and never blocks input;
 * GSAP stays off the first view's network. The signature itself (the candle glyph unfolding into
 * live candles) is the field renderer's own WebGPU unfold, which this timeline waits for. Reduced
 * motion: no timeline; CSS shows every end state at once.
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
    const tl = gsap.timeline({ defaults: { ease: EASE_OUT }, paused: true });
    // The product part is built once the chart is ready, and knows whether the field or the poster
    // is the ground to settle.
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

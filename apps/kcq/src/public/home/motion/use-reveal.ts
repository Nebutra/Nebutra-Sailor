/**
 * The shared scroll reveal (ADR 2026-10-09 landing motion system, ADR-C): IntersectionObserver,
 * once, grouped stagger. CSS owns the movement (public.css `[data-reveal]`); this only decides
 * the state. A group is armed after hydration, and only when motion is allowed and the group is
 * still below the fold, so the prerendered page, no-JS, reduced motion and anything already on
 * screen show the finished content and nothing ever hides. Played once: the observer stops.
 */
import { useIntersectionObserver } from "@vueuse/core";
import { computed, type MaybeRefOrGetter, onMounted, ref, toValue } from "vue";

export type RevealState = "armed" | "shown" | undefined;

/** Pure decision, testable: arm only what the visitor has not seen yet. */
export function shouldArm(top: number, viewport: number, reducedMotion: boolean) {
  return !reducedMotion && top > viewport;
}

export function useReveal(target: MaybeRefOrGetter<HTMLElement | null | undefined>, threshold = 0.15) {
  const armed = ref(false);
  const shown = ref(false);
  onMounted(() => {
    const element = toValue(target);
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    armed.value = shouldArm(element.getBoundingClientRect().top, window.innerHeight, reduced);
  });
  const { stop } = useIntersectionObserver(
    target,
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      shown.value = true;
      stop();
    },
    { threshold },
  );
  /** Bind as `:data-reveal` on the group element. */
  const state = computed<RevealState>(() => (armed.value ? (shown.value ? "shown" : "armed") : undefined));
  return { state };
}

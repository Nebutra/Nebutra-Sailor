/**
 * The agent replay's state, scoped to the agent section's subtree (VueUse `createInjectionState`):
 * the transcript, the chart, the glyph and the scrubber read one step counter instead of each
 * keeping its own. `step` is the number of completed calls; while playing, call `step` is the one
 * running. Prerender and reduced motion show the final state; the replay is interruptible at any
 * step (research K3) and never animates on its own under reduced motion (K4).
 */
import { createInjectionState, useIntervalFn, usePreferredReducedMotion } from "@vueuse/core";
import { computed, ref } from "vue";

export const SPEEDS = [1, 2] as const;
export type Speed = (typeof SPEEDS)[number];
/** One call per beat at 1×: long enough to read the call, short enough to stay a demo. */
const BEAT_MS = 1100;

export const [useProvideReplay, useReplay] = createInjectionState((total: number) => {
  const step = ref(total);
  const playing = ref(false);
  const speed = ref<Speed>(1);
  const motion = usePreferredReducedMotion();
  const reduced = computed(() => motion.value === "reduce");
  const running = computed(() => (playing.value && step.value < total ? step.value : -1));

  const timer = useIntervalFn(
    () => {
      step.value = Math.min(total, step.value + 1);
      if (step.value >= total) pause();
    },
    () => BEAT_MS / speed.value,
    { immediate: false },
  );

  function play() {
    if (reduced.value) {
      step.value = total;
      return;
    }
    if (step.value >= total) step.value = 0;
    playing.value = true;
    timer.resume();
  }
  function pause() {
    playing.value = false;
    timer.pause();
  }
  function toggle() {
    if (playing.value) pause();
    else play();
  }
  /** Jump to a step; any manual move stops playback (the user took over). */
  function seek(next: number) {
    pause();
    step.value = Math.max(0, Math.min(total, next));
  }
  /** Scroll-driven position (motion/agent-story.ts): reversible, and it stops playback. */
  function scrub(progress: number) {
    if (playing.value) pause();
    step.value = Math.min(total, Math.floor(progress * (total + 1)));
  }
  function cycleSpeed() {
    speed.value = SPEEDS[(SPEEDS.indexOf(speed.value) + 1) % SPEEDS.length]!;
  }

  return { total, step, playing, running, speed, reduced, play, pause, toggle, seek, scrub, cycleSpeed };
});

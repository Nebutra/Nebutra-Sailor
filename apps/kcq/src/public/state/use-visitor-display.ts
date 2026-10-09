/**
 * Facts measured on the visitor's own screen, never claimed: device pixel ratio and refresh rate
 * (from requestAnimationFrame deltas). A quiet caption under the loupe; `null` until measured.
 */
import { createSharedComposable, useDevicePixelRatio } from "@vueuse/core";
import { ref } from "vue";

/** Common panel rates; a median delta snaps to the nearest so 59.94 Hz reads 60. */
const RATES = [30, 48, 50, 60, 75, 90, 100, 120, 144, 165, 240];
const SAMPLES = 40;

function measureRefreshRate(): Promise<number | null> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let last = 0;
    const tick = (now: number) => {
      if (last) deltas.push(now - last);
      last = now;
      if (deltas.length < SAMPLES) requestAnimationFrame(tick);
      else {
        const median = [...deltas].sort((a, b) => a - b)[deltas.length >> 1]!;
        const hz = 1000 / median;
        resolve(RATES.reduce((best, rate) => (Math.abs(rate - hz) < Math.abs(best - hz) ? rate : best)));
      }
    };
    // Hidden tabs throttle rAF; measuring then would report the throttle, not the screen.
    if (document.hidden) resolve(null);
    else requestAnimationFrame(tick);
  });
}

function useVisitorDisplayState() {
  const { pixelRatio } = useDevicePixelRatio();
  const hz = ref<number | null>(null);
  let measuring: Promise<void> | undefined;

  /** Idempotent; call when a consumer becomes visible. */
  function measure() {
    measuring ??= measureRefreshRate().then((value) => {
      hz.value = value;
    });
    return measuring;
  }

  return { pixelRatio, hz, measure };
}

export const useVisitorDisplay = createSharedComposable(useVisitorDisplayState);

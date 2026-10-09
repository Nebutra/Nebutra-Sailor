/**
 * Adaptive quality, after vgpu's `adaptive-quality` example (MIT, vgpu 0.5.0): start High, watch
 * advisory signals, and step down to Low once, never back up, so there is no oscillation. The
 * controller and frame-health policy follow the example; the signals are KCQ's (no detect-gpu
 * benchmark fetch: the CSP and the page budget rule it out). Low means fewer cascade levels and
 * trace steps at a lower field resolution (scene.ts TIER_BUDGET, renderer.ts TIER_SCALE).
 */
import type { FieldTier } from "./scene";

export type DowngradeReason = "device" | "battery" | "frame-health";

export interface TierResources {
  prepare(): Promise<void>;
  destroy(): void;
}

/**
 * Builds a tier off-screen and swaps it in only when ready; in `auto` the one transition is High →
 * Low. A failed Low build keeps High on screen.
 */
export function createQualityController<T extends TierResources>(options: {
  createTier(tier: FieldTier): T | Promise<T>;
  onActivate(tier: FieldTier, resources: T): void;
}) {
  let requested: FieldTier = "high";
  let activeTier: FieldTier | undefined;
  let active: T | undefined;
  let running: Promise<void> | undefined;
  let disposed = false;

  const run = async () => {
    while (!disposed && activeTier !== requested) {
      const tier = requested;
      const candidate = await options.createTier(tier);
      try {
        await candidate.prepare();
      } catch (error) {
        candidate.destroy();
        if (activeTier) {
          requested = activeTier;
          return;
        }
        throw error;
      }
      if (disposed || tier !== requested) {
        candidate.destroy();
        continue;
      }
      options.onActivate(tier, candidate);
      const previous = active;
      active = candidate;
      activeTier = tier;
      previous?.destroy();
    }
  };
  const ensure = () => {
    running ??= run().finally(() => {
      running = undefined;
    });
    return running;
  };
  const ready = ensure();

  return {
    ready,
    get tier() {
      return activeTier ?? requested;
    },
    get active() {
      return active;
    },
    downgrade(_reason: DowngradeReason) {
      if (disposed || requested === "low") return Promise.resolve();
      requested = "low";
      return ensure();
    },
    /** Rebuild the active tier (after a resize). */
    rebuild() {
      if (disposed || !activeTier) return Promise.resolve();
      activeTier = undefined;
      return ensure();
    },
    destroy() {
      disposed = true;
      active?.destroy();
      active = undefined;
    },
  };
}

/**
 * Presented-frame health over active animation time (vgpu frame-health policy): judged against
 * the display refresh capped at 90, downgrade when below 80% for two seconds of active frames.
 * Idle gaps over 250 ms reset the window instead of counting as drops.
 */
export function createFrameHealth(windowMs = 2000, ratio = 0.8, maxFps = 90) {
  let frames: number[] = [];
  let total = 0;
  let refresh = 60;
  const samples: number[] = [];
  return {
    record(deltaMs: number): boolean {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 250) {
        frames = [];
        total = 0;
        return false;
      }
      if (deltaMs >= 4 && deltaMs <= 50) {
        samples.push(deltaMs);
        if (samples.length > 20) samples.shift();
        if (samples.length === 20) {
          const sorted = [...samples].sort((a, b) => a - b);
          const median = sorted[10]!;
          if ((sorted[16]! - sorted[4]!) / median <= 0.12 && 1000 / median > refresh + 4) refresh = 1000 / median;
        }
      }
      frames.push(deltaMs);
      total += deltaMs;
      while (frames.length > 1 && total - frames[0]! >= windowMs) total -= frames.shift()!;
      const observed = frames.length / (total / 1000);
      return total >= windowMs && observed < Math.min(refresh, maxFps) * ratio;
    },
    reset() {
      frames = [];
      total = 0;
    },
  };
}

interface BatteryLike extends EventTarget {
  readonly charging: boolean;
  readonly level: number;
}

/**
 * Device and battery signals. Device: a coarse pointer on a small screen (the example's
 * "isMobile" tier) or a WebGPU fallback adapter. Battery: discharging at 30% or less.
 */
export function watchQualitySignals(
  adapter: GPUAdapter,
  onDowngrade: (reason: DowngradeReason) => void,
): () => void {
  const fallback = (adapter as GPUAdapter & { isFallbackAdapter?: boolean }).isFallbackAdapter === true
    || (adapter as GPUAdapter & { info?: { isFallbackAdapter?: boolean } }).info?.isFallbackAdapter === true;
  const handheld = window.matchMedia("(pointer: coarse) and (max-width: 1023px)").matches;
  if (fallback || handheld) {
    onDowngrade("device");
    return () => {};
  }
  let battery: BatteryLike | undefined;
  const check = () => {
    if (battery && !battery.charging && battery.level <= 0.3) onDowngrade("battery");
  };
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
  void nav
    .getBattery?.()
    .then((manager) => {
      battery = manager;
      check();
      manager.addEventListener("levelchange", check);
      manager.addEventListener("chargingchange", check);
    })
    .catch(() => {});
  return () => {
    battery?.removeEventListener("levelchange", check);
    battery?.removeEventListener("chargingchange", check);
  };
}

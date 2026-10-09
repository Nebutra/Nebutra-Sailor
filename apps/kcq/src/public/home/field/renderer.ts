/**
 * The hero light field in the browser (lazy chunk; loaded only when WebGPU exists and motion is
 * allowed, see hero-chart.vue). It renders only when something changed: the opening unfold, a new
 * bar, the crosshair. A static field costs no GPU time; hidden or off-screen it renders nothing.
 */
import type { ChartGeometry } from "../hero/live-chart";
import { crosshair, EXPOSURE, type FieldPalette, glyphOnly, packShapes, type Rgb, unfold } from "./field-shapes";
import { createFrameHealth, createQualityController, watchQualitySignals } from "./quality";
import { createFieldScene, type FieldScene, type FieldTier } from "./scene";

/** Field texels per CSS pixel. Light is diffuse; the crisp chart draws on top. */
const TIER_SCALE: Record<FieldTier, number> = { high: 0.75, low: 0.5 };
/** The opening move, rare by design (craft-principles rule 31: delight budget). */
const UNFOLD_MS = 1400;

export interface FieldLook {
  readonly palette: FieldPalette;
  readonly ground: Rgb;
  readonly mode: "light" | "dark";
}

export interface HeroField {
  setGeometry(geometry: ChartGeometry): void;
  /** Glyph → candles; resolves when the field shows the chart. */
  unfold(): Promise<void>;
  setPointer(point: readonly [number, number] | null): void;
  setLook(look: FieldLook): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

/** Resolves null when WebGPU cannot start; the poster stays. */
export async function createHeroField(canvas: HTMLCanvasElement, initial: FieldLook): Promise<HeroField | null> {
  const { Device } = await import("@vgpu/core");
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "low-power" });
  if (!adapter) return null;
  let device: InstanceType<typeof Device>;
  try {
    device = new Device(await adapter.requestDevice(), adapter.info ?? null);
  } catch {
    return null;
  }
  const context = canvas.getContext("webgpu");
  if (!context) {
    device.dispose();
    return null;
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device: device.gpu, format, alphaMode: "opaque" });

  let look = initial;
  let geometry: ChartGeometry | null = null;
  let pointer: readonly [number, number] | null = null;
  let phase: "glyph" | "unfold" | "chart" = "glyph";
  let unfoldStart = 0;
  let finishUnfold: (() => void) | undefined;
  let paused = false;
  let visible = true;
  let dirty = true;
  let disposed = false;
  let frame = 0;
  let lastTick = 0;
  let cssSize: [number, number] = [canvas.clientWidth, canvas.clientHeight];
  const health = createFrameHealth();

  interface TierBuild {
    readonly scene: FieldScene;
    prepare(): Promise<void>;
    destroy(): void;
  }
  const quality = createQualityController<TierBuild>({
    createTier(tier) {
      const scene = createFieldScene(
        device,
        [cssSize[0] * TIER_SCALE[tier], cssSize[1] * TIER_SCALE[tier]],
        tier,
        format,
      );
      return { scene, prepare: () => scene.prepare(), destroy: () => scene.destroy() };
    },
    onActivate(_tier, { scene }) {
      [canvas.width, canvas.height] = scene.size;
      health.reset();
      dirty = true;
    },
  });

  const stopSignals = watchQualitySignals(adapter, (reason) => void quality.downgrade(reason));

  const shapes = () => {
    const [w, h] = cssSize;
    if (phase === "glyph" || !geometry) return glyphOnly(w, h, look.palette);
    const progress = phase === "unfold" ? Math.min(1, (performance.now() - unfoldStart) / UNFOLD_MS) : 1;
    if (phase === "unfold" && progress >= 1) {
      phase = "chart";
      finishUnfold?.();
      finishUnfold = undefined;
    }
    const lit = unfold(geometry, w, h, look.palette, progress);
    if (pointer && phase === "chart") lit.push(crosshair(pointer, look.palette));
    return lit;
  };

  const tick = (now: number) => {
    frame = 0;
    if (disposed) return;
    const scene = quality.active?.scene;
    const animating = phase === "unfold";
    if (scene && !paused && visible && !document.hidden && (dirty || animating)) {
      const { data, count } = packShapes(shapes(), TIER_SCALE[scene.tier]);
      scene.setShapes(data, count);
      scene.render(context.getCurrentTexture().createView(), {
        ground: look.ground,
        mode: look.mode,
        exposure: EXPOSURE[look.mode],
        emitterVisibility: 1,
      });
      if (quality.tier === "high" && health.record(now - lastTick)) void quality.downgrade("frame-health");
      dirty = false;
    } else {
      health.reset();
    }
    lastTick = now;
    if (phase === "unfold" || dirty) schedule();
  };
  const schedule = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  };
  const invalidate = () => {
    dirty = true;
    schedule();
  };

  const resize = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const next: [number, number] = [entry.contentRect.width, entry.contentRect.height];
    if (Math.abs(next[0] - cssSize[0]) < 2 && Math.abs(next[1] - cssSize[1]) < 2) return;
    cssSize = next;
    void quality.rebuild().then(invalidate);
  });
  resize.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) invalidate();
  });
  intersection.observe(canvas);
  const onVisibility = () => {
    if (!document.hidden) invalidate();
  };
  document.addEventListener("visibilitychange", onVisibility);

  try {
    await quality.ready;
  } catch {
    stopSignals();
    resize.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    device.dispose();
    return null;
  }
  invalidate();

  return {
    setGeometry(next) {
      geometry = next;
      invalidate();
    },
    unfold() {
      if (paused || !geometry) {
        phase = "chart";
        invalidate();
        return Promise.resolve();
      }
      phase = "unfold";
      unfoldStart = performance.now();
      schedule();
      return new Promise<void>((resolve) => {
        finishUnfold = resolve;
      });
    },
    setPointer(next) {
      pointer = next;
      if (phase === "chart") invalidate();
    },
    setLook(next) {
      look = next;
      invalidate();
    },
    setPaused(next) {
      paused = next;
      if (paused && phase === "unfold") {
        phase = "chart";
        finishUnfold?.();
        finishUnfold = undefined;
      }
      if (!paused) invalidate();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      finishUnfold?.();
      stopSignals();
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      quality.destroy();
      device.dispose();
    },
  };
}

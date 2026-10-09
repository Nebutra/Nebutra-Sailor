/**
 * The light-field pass chain, independent of where it runs: the browser passes `vgpu`, the poster
 * script (scripts/render-poster.ts) passes `vgpu/node`, so the prerendered poster is this exact
 * scene. Pass order and target recycling follow vgpu's radiance-cascades example; see shaders.ts.
 */
import type { Effect, Gpu, Surface, Target } from "vgpu";
import {
  CASCADE_WGSL,
  JFA_INIT_WGSL,
  JFA_STEP_WGSL,
  MAX_SHAPES,
  PAINT_WGSL,
  PRESENT_WGSL,
  SDF_WGSL,
  SHAPE_STRIDE,
} from "./shaders";

/** The vgpu entry points the scene uses; `vgpu` and `vgpu/node` both provide them. */
export interface FieldApi {
  effect: typeof import("vgpu").effect;
  frame: typeof import("vgpu").frame;
  sampler: typeof import("vgpu").sampler;
  storage: typeof import("vgpu").storage;
  target: typeof import("vgpu").target;
}

export type FieldTier = "high" | "low";

/** What each tier costs: trace steps per ray and the cap on cascade levels. */
const TIER_BUDGET: Record<FieldTier, { steps: number; maxCascades: number }> = {
  high: { steps: 16, maxCascades: 6 },
  low: { steps: 10, maxCascades: 5 },
};

const HDR: GPUTextureFormat = "rgba16float";
const SEED: GPUTextureFormat = "rgba32float";

export interface PresentOptions {
  /** Linear RGB of the preset surface under the field. */
  readonly ground: readonly [number, number, number];
  readonly mode: "light" | "dark";
  readonly exposure: number;
  /** 0..1: how much the emitters' own shapes show (1 before the chart covers them). */
  readonly emitterVisibility: number;
}

export function createFieldScene(api: FieldApi, gpu: Gpu, requested: readonly [number, number], tier: FieldTier) {
  const width = Math.max(8, Math.floor(requested[0]));
  const height = Math.max(8, Math.floor(requested[1]));
  const size: [number, number] = [width, height];
  const budget = TIER_BUDGET[tier];
  const cascadeCount = Math.min(
    budget.maxCascades,
    Math.max(4, Math.ceil(Math.log(1 + (3 * Math.hypot(width, height)) / 2) / Math.log(4))),
  );
  const spacing = 2 ** (cascadeCount - 1);
  const atlas: [number, number] = [
    Math.ceil(width / spacing) * spacing * 2,
    Math.ceil(height / spacing) * spacing * 2,
  ];
  const jumpCount = Math.ceil(Math.log2(Math.max(width, height, 2)));
  const jumps = [...Array.from({ length: jumpCount }, (_, i) => 2 ** (jumpCount - i - 1)), 1];

  const owned: Target[] = [];
  const own = (resource: Target) => {
    owned.push(resource);
    return resource;
  };
  const emitter = own(api.target(gpu, { size, format: HDR }));
  let seeds: [Target, Target] = [own(api.target(gpu, { size, format: SEED })), own(api.target(gpu, { size, format: SEED }))];
  const sdf = own(api.target(gpu, { size, format: HDR }));
  let cascades: [Target, Target] = [own(api.target(gpu, { size: atlas, format: HDR })), own(api.target(gpu, { size: atlas, format: HDR }))];
  const shapes = api.storage(gpu, MAX_SHAPES * SHAPE_STRIDE * 16, "read");
  const linear = api.sampler(gpu, {
    minFilter: "linear",
    magFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });
  const effects = {
    paint: api.effect(gpu, PAINT_WGSL),
    jfaInit: api.effect(gpu, JFA_INIT_WGSL),
    // set() writes immediately, so every encoded pass gets its own effect (vgpu example note).
    jfaSteps: jumps.map(() => api.effect(gpu, JFA_STEP_WGSL)),
    sdf: api.effect(gpu, SDF_WGSL),
    cascade: Array.from({ length: cascadeCount }, () => api.effect(gpu, CASCADE_WGSL)),
    present: api.effect(gpu, PRESENT_WGSL),
  };
  let shapeCount = 0;

  async function prepare(outputFormat: GPUTextureFormat) {
    await Promise.all([
      effects.paint.compile({ colors: [HDR] }),
      effects.jfaInit.compile({ colors: [SEED] }),
      ...effects.jfaSteps.map((effect) => effect.compile({ colors: [SEED] })),
      effects.sdf.compile({ colors: [HDR] }),
      ...effects.cascade.map((effect) => effect.compile({ colors: [HDR] })),
      effects.present.compile({ colors: [outputFormat] }),
    ]);
  }

  /** `data` holds `count` shapes, SHAPE_STRIDE vec4f each (see field-shapes.ts). */
  function setShapes(data: Float32Array<ArrayBuffer>, count: number) {
    shapeCount = Math.min(count, MAX_SHAPES);
    shapes.write(data.subarray(0, shapeCount * SHAPE_STRIDE * 4));
  }

  /** Paint → seed → flood → distance → cascades (top down) → present. One frame. */
  function render(output: Surface | Target, options: PresentOptions) {
    const passes: { target: Target | Surface; effect: Effect }[] = [];
    effects.paint.set({ paint: { count: [shapeCount, width, height, 0] }, shapes });
    passes.push({ target: emitter, effect: effects.paint });
    effects.jfaInit.set({ emitter });
    passes.push({ target: seeds[0], effect: effects.jfaInit });
    let [read, write] = seeds;
    jumps.forEach((jump, index) => {
      const step = effects.jfaSteps[index]!;
      step.set({ jfa: { jump: [jump, 0, 0, 0] }, seeds: read });
      passes.push({ target: write, effect: step });
      [read, write] = [write, read];
    });
    seeds = [read, write];
    effects.sdf.set({ seeds: read });
    passes.push({ target: sdf, effect: effects.sdf });
    let [atlasWrite, atlasRead] = cascades;
    for (let level = cascadeCount - 1; level >= 0; level--) {
      const cascade = effects.cascade[level]!;
      cascade.set({
        rc: { state: [level, level < cascadeCount - 1 ? 1 : 0, budget.steps, 0] },
        sdf_tex: sdf,
        sdf_samp: linear,
        emitter_tex: emitter,
        emitter_samp: linear,
        upper_tex: atlasRead,
      });
      passes.push({ target: atlasWrite, effect: cascade });
      [atlasRead, atlasWrite] = [atlasWrite, atlasRead];
    }
    cascades = [atlasRead, atlasWrite];
    effects.present.set({
      present: {
        ground: [...options.ground, options.mode === "light" ? 1 : 0],
        tone: [options.exposure, options.emitterVisibility, 0, 0],
      },
      cascade_tex: atlasRead,
      emitter_tex: emitter,
    });
    passes.push({ target: output, effect: effects.present });
    api.frame(gpu, (frame) => {
      for (const pass of passes) {
        frame.pass({ target: pass.target, clear: [0, 0, 0, 0] }, (encoder) => encoder.draw(pass.effect));
      }
    });
  }

  function destroy() {
    for (const resource of owned) (resource as Target & { destroy?: () => void }).destroy?.();
    (shapes as { destroy?: () => void }).destroy?.();
  }

  return { size, tier, cascadeCount, prepare, setShapes, render, destroy };
}

export type FieldScene = ReturnType<typeof createFieldScene>;

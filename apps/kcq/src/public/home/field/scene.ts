/**
 * The light-field pass chain on `@vgpu/core` (exact 0.5.0): its `Device`, textures, buffers and
 * bind helpers, with one fullscreen-triangle pipeline per pass. It runs wherever a GPUDevice
 * exists: the browser (renderer.ts) and Dawn in Node for the poster (scripts/render-poster.ts),
 * so the prerendered poster is this exact scene. Pass order and target recycling follow vgpu's
 * radiance-cascades example; see shaders.ts.
 */
import { type Buffer, createBindGroup, createSampler, type Device, type Texture } from "@vgpu/core";
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

export type FieldTier = "high" | "low";

/** What each tier costs: trace steps per ray and the cap on cascade levels. */
const TIER_BUDGET: Record<FieldTier, { steps: number; maxCascades: number }> = {
  high: { steps: 16, maxCascades: 6 },
  low: { steps: 10, maxCascades: 5 },
};

const HDR: GPUTextureFormat = "rgba16float";
const SEED: GPUTextureFormat = "rgba32float";
/** GPUShaderStage.FRAGMENT; the global is absent in Node until Dawn installs it. */
const FRAGMENT = 2;

/** Fullscreen triangle; `uv` grows right and down, as the fragment shaders expect. */
const VERTEX_WGSL = /* wgsl */ `
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> VsOut {
  var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let p = corners[index];
  var out: VsOut;
  out.position = vec4f(p, 0.0, 1.0);
  out.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  return out;
}
`;

/** Binding kinds in WGSL binding order. Seeds are rgba32float, which is unfilterable. */
type Slot = "uniform" | "storage" | "texture" | "seeds" | "sampler";

function entryFor(slot: Slot, binding: number): GPUBindGroupLayoutEntry {
  if (slot === "uniform") return { binding, visibility: FRAGMENT, buffer: { type: "uniform" } };
  if (slot === "storage") return { binding, visibility: FRAGMENT, buffer: { type: "read-only-storage" } };
  if (slot === "sampler") return { binding, visibility: FRAGMENT, sampler: { type: "filtering" } };
  return {
    binding,
    visibility: FRAGMENT,
    texture: { sampleType: slot === "seeds" ? "unfilterable-float" : "float" },
  };
}

interface Pass {
  readonly pipeline: Promise<GPURenderPipeline>;
  readonly layout: GPUBindGroupLayout;
}

function pass(device: Device, wgsl: string, slots: readonly Slot[], format: GPUTextureFormat): Pass {
  const layout = device.gpu.createBindGroupLayout({ entries: slots.map(entryFor) });
  const module = device.gpu.createShaderModule({ code: `${VERTEX_WGSL}\n${wgsl}` });
  const pipeline = device.gpu.createRenderPipelineAsync({
    layout: device.gpu.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: { module, entryPoint: "vs_main" },
    fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  return { pipeline, layout };
}

export interface PresentOptions {
  /** Linear RGB of the preset surface under the field. */
  readonly ground: readonly [number, number, number];
  readonly mode: "light" | "dark";
  readonly exposure: number;
  /** 0..1: how much the emitters' own shapes show (1 before the chart covers them). */
  readonly emitterVisibility: number;
}

type Bindable = Texture | Buffer | GPUSampler;

export function createFieldScene(
  device: Device,
  requested: readonly [number, number],
  tier: FieldTier,
  outputFormat: GPUTextureFormat,
) {
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

  const textures: Texture[] = [];
  const buffers: Buffer[] = [];
  const texture = (dims: [number, number], format: GPUTextureFormat) => {
    const created = device.createTexture({
      kind: "2d",
      size: dims,
      format,
      usage: ["render_attachment", "texture_binding"],
    });
    textures.push(created);
    return created;
  };
  const uniform = (bytes: number) => {
    const created = device.createBuffer({ size: bytes, usage: ["uniform", "copy_dst"] });
    buffers.push(created);
    return created;
  };

  const emitter = texture(size, HDR);
  let seeds: [Texture, Texture] = [texture(size, SEED), texture(size, SEED)];
  const sdf = texture(size, HDR);
  let cascades: [Texture, Texture] = [texture(atlas, HDR), texture(atlas, HDR)];
  const shapes = device.createBuffer({
    size: MAX_SHAPES * SHAPE_STRIDE * 16,
    usage: ["storage", "copy_dst"],
  });
  buffers.push(shapes);
  const linear = createSampler(device, { filter: "linear", wrap: "clamp" });

  // Uniforms are written before the frame is submitted, so every pass owns its buffer.
  const paintUniform = uniform(16);
  const jumpUniforms = jumps.map(() => uniform(16));
  const cascadeUniforms = Array.from({ length: cascadeCount }, () => uniform(16));
  const presentUniform = uniform(32);

  const passes = {
    paint: pass(device, PAINT_WGSL, ["uniform", "storage"], HDR),
    jfaInit: pass(device, JFA_INIT_WGSL, ["texture"], SEED),
    jfaStep: pass(device, JFA_STEP_WGSL, ["uniform", "seeds"], SEED),
    sdf: pass(device, SDF_WGSL, ["seeds"], HDR),
    cascade: pass(
      device,
      CASCADE_WGSL,
      ["uniform", "texture", "sampler", "texture", "sampler", "texture"],
      HDR,
    ),
    present: pass(device, PRESENT_WGSL, ["uniform", "texture", "texture"], outputFormat),
  };
  type PassName = keyof typeof passes;
  let pipelines: Record<PassName, GPURenderPipeline> | undefined;
  let shapeCount = 0;

  async function prepare() {
    const names = Object.keys(passes) as PassName[];
    const built = await Promise.all(names.map((name) => passes[name].pipeline));
    pipelines = Object.fromEntries(names.map((name, index) => [name, built[index]!])) as Record<
      PassName,
      GPURenderPipeline
    >;
  }

  /** `data` holds `count` shapes, SHAPE_STRIDE vec4f each (see field-shapes.ts). */
  function setShapes(data: Float32Array<ArrayBuffer>, count: number) {
    shapeCount = Math.min(count, MAX_SHAPES);
    shapes.write(data.subarray(0, Math.max(1, shapeCount) * SHAPE_STRIDE * 4));
  }

  const resource = (value: Bindable): GPUBindingResource => {
    if ("view" in value) return value.view;
    if ("write" in value) return { buffer: value.gpu };
    return value;
  };

  /** Paint → seed → flood → distance → cascades (top down) → present. One submission. */
  function render(output: GPUTextureView, options: PresentOptions) {
    const ready = pipelines;
    if (!ready) return;
    const encoder = device.gpu.createCommandEncoder();
    const draw = (target: GPUTextureView, name: PassName, bindings: readonly Bindable[]) => {
      const group = createBindGroup(device, {
        layout: passes[name].layout,
        entries: bindings.map((value, binding) => ({ binding, resource: resource(value) })),
      });
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [
          { view: target, loadOp: "clear", clearValue: [0, 0, 0, 0], storeOp: "store" },
        ],
      });
      renderPass.setPipeline(ready[name]);
      renderPass.setBindGroup(0, group);
      renderPass.draw(3);
      renderPass.end();
    };

    paintUniform.write(new Float32Array([shapeCount, width, height, 0]));
    draw(emitter.view, "paint", [paintUniform, shapes]);
    draw(seeds[0].view, "jfaInit", [emitter]);
    let [read, write] = seeds;
    jumps.forEach((jump, index) => {
      jumpUniforms[index]!.write(new Float32Array([jump, 0, 0, 0]));
      draw(write.view, "jfaStep", [jumpUniforms[index]!, read]);
      [read, write] = [write, read];
    });
    seeds = [read, write];
    draw(sdf.view, "sdf", [read]);
    let [atlasWrite, atlasRead] = cascades;
    for (let level = cascadeCount - 1; level >= 0; level--) {
      cascadeUniforms[level]!.write(
        new Float32Array([level, level < cascadeCount - 1 ? 1 : 0, budget.steps, 0]),
      );
      draw(atlasWrite.view, "cascade", [
        cascadeUniforms[level]!,
        sdf,
        linear,
        emitter,
        linear,
        atlasRead,
      ]);
      [atlasRead, atlasWrite] = [atlasWrite, atlasRead];
    }
    cascades = [atlasRead, atlasWrite];
    presentUniform.write(
      new Float32Array([
        ...options.ground,
        options.mode === "light" ? 1 : 0,
        options.exposure,
        options.emitterVisibility,
        0,
        0,
      ]),
    );
    draw(output, "present", [presentUniform, atlasRead, emitter]);
    device.gpu.queue.submit([encoder.finish()]);
  }

  function destroy() {
    for (const item of textures) item.destroy();
    for (const item of buffers) item.destroy();
  }

  return { size, tier, cascadeCount, prepare, setShapes, render, destroy };
}

export type FieldScene = ReturnType<typeof createFieldScene>;

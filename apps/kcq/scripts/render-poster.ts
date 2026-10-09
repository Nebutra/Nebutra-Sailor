/**
 * Render the hero poster: the light field's opening frame (the KCQ glyph as the only light) with
 * the same scene, shaders and token colours the browser uses, headless through vgpu/node (Dawn).
 * The poster is the LCP image and the permanent fallback without WebGPU, so it must be this exact
 * scene, not an approximation. Output is committed; re-run when the glyph, shaders or tokens change:
 *
 *   KCQ_SOURCE_DIR=… pnpm exec tsx apps/kcq/scripts/render-poster.ts
 */
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { effect, frame, init, sampler, storage, target } from "vgpu/node";
import {
  EXPOSURE,
  glyphOnly,
  hexToLinear,
  POSTER_SIZE,
  packShapes,
} from "../src/public/home/field/field-shapes";
import { createFieldScene } from "../src/public/home/field/scene";
// @ts-expect-error: plain ESM build helper without types.
import { readVars } from "./landing-source.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = process.env.KCQ_SOURCE_DIR;
if (!source) throw new Error("Set KCQ_SOURCE_DIR to the pinned chart checkout");
const tokens = (file: string) =>
  readVars(readFileSync(resolve(source, "packages/core/design-tokens/css", file), "utf8")) as Map<
    string,
    string
  >;
const accent = tokens("foundation.css").get("--klc-brand-accent")!;

const [WIDTH, HEIGHT] = POSTER_SIZE;
const out = resolve(root, "src/public/home/hero/poster");
mkdirSync(out, { recursive: true });

const gpu = await init();
for (const mode of ["dark", "light"] as const) {
  const vars = tokens(`theme.pro.${mode}.css`);
  const palette = {
    up: hexToLinear(vars.get("--klc-color-candle-up-body")!),
    down: hexToLinear(vars.get("--klc-color-candle-down-body")!),
    accent: hexToLinear(accent),
  };
  const scene = createFieldScene(
    { effect, frame, sampler, storage, target },
    gpu,
    [WIDTH, HEIGHT],
    "high",
  );
  await scene.prepare("rgba8unorm");
  const { data, count } = packShapes(glyphOnly(WIDTH, HEIGHT, palette), 1);
  scene.setShapes(data, count);
  const image = target(gpu, { size: [WIDTH, HEIGHT], format: "rgba8unorm" });
  scene.render(image, {
    ground: hexToLinear(vars.get("--klc-color-chart-background")!),
    mode,
    exposure: EXPOSURE[mode],
    emitterVisibility: 1,
  });
  const pixels = await image.color.read({ mipLevel: 0, region: "all" });
  const raw = sharp(Buffer.from(pixels), {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  }).removeAlpha();
  for (const width of [1600, 800]) {
    const file = resolve(out, `poster-${mode}-${width}.webp`);
    await raw.clone().resize(width).webp({ quality: 78, effort: 6 }).toFile(file);
    console.log(`wrote ${file}`);
  }
  scene.destroy();
}
gpu.dispose();

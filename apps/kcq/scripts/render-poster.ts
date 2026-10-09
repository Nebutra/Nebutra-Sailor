/**
 * Render the hero poster: the light field's opening frame (the KCQ glyph as the only light) with
 * the same scene, shaders and token colours the browser uses, headless on Dawn. The poster is the
 * LCP image and the permanent fallback without WebGPU, so it must be this exact scene, not an
 * approximation. The committed poster is the source of truth; re-run only when the glyph, shaders
 * or tokens change.
 *
 * Dawn (the native `webgpu` package) is deliberately not part of the workspace install. Fetch it
 * once outside the repo and point the script at it:
 *
 *   npm --prefix /tmp/kcq-dawn install webgpu@0.4.0
 *   KCQ_WEBGPU=/tmp/kcq-dawn/node_modules/webgpu/index.js KCQ_SOURCE_DIR=… \
 *     pnpm exec tsx apps/kcq/scripts/render-poster.ts
 */
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Device } from "@vgpu/core";
import sharp from "sharp";
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

const dawnPath = process.env.KCQ_WEBGPU;
if (!dawnPath) {
  throw new Error(
    "Set KCQ_WEBGPU to Dawn's entry: npm --prefix /tmp/kcq-dawn install webgpu@0.4.0, then " +
      "KCQ_WEBGPU=/tmp/kcq-dawn/node_modules/webgpu/index.js (see the header of this script).",
  );
}
const dawn = (await import(pathToFileURL(dawnPath).href)) as {
  create(flags: string[]): GPU;
  globals: Record<string, unknown>;
};
Object.assign(globalThis, dawn.globals);
// Dawn resolves async work (pipelines, readback) from Node's loop; keep it alive until done.
const keepAlive = setInterval(() => {}, 10);
// Keep the instance referenced for the whole run: if it is collected, Dawn aborts mid-frame.
const instance = dawn.create([]);
const adapter = await instance.requestAdapter();
if (!adapter) throw new Error("Dawn found no GPU adapter");
const device = new Device(await adapter.requestDevice(), null);
for (const mode of ["dark", "light"] as const) {
  const vars = tokens(`theme.pro.${mode}.css`);
  const palette = {
    up: hexToLinear(vars.get("--klc-color-candle-up-body")!),
    down: hexToLinear(vars.get("--klc-color-candle-down-body")!),
    accent: hexToLinear(accent),
  };
  const scene = createFieldScene(device, [WIDTH, HEIGHT], "high", "rgba8unorm");
  await scene.prepare();
  const { data, count } = packShapes(glyphOnly(WIDTH, HEIGHT, palette), 1);
  scene.setShapes(data, count);
  const image = device.createTexture({
    kind: "2d",
    size: [WIDTH, HEIGHT],
    format: "rgba8unorm",
    usage: ["render_attachment", "copy_src"],
  });
  scene.render(image.view, {
    ground: hexToLinear(vars.get("--klc-color-chart-background")!),
    mode,
    exposure: EXPOSURE[mode],
    emitterVisibility: 1,
  });
  const pixels = await image.read({ mipLevel: 0, region: "all" });
  const raw = sharp(Buffer.from(pixels), {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  }).removeAlpha();
  for (const width of [1600, 800]) {
    const file = resolve(out, `poster-${mode}-${width}.webp`);
    await raw.clone().resize(width).webp({ quality: 78, effort: 6 }).toFile(file);
    console.log(`wrote ${file}`);
  }
  image.destroy();
  scene.destroy();
}
device.dispose();
clearInterval(keepAlive);
void instance;
// Dawn can abort while tearing down its threads after the files are written; exit explicitly.
process.exit(0);

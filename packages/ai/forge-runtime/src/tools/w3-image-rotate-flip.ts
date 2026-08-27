/**
 * image-rotate-flip — reorient one raster image (Editor root, instant transform).
 *
 * Brief: docs/plans/tools/image-rotate-flip.md. The job is "this photo is
 * sideways / upside down / mirrored — give me the same image, reoriented",
 * not a creative edit. What the brief demands beyond a naive clone (§7):
 *
 *  1. A rotation by a multiple of 90° is a lossless transpose/reversal: width
 *     and height swap on 90°/270°, no pixel value is ever blended, and no
 *     canvas decision arises. Any other angle resamples. The two paths are
 *     kept apart here — an angle within RIGHT_ANGLE_EPSILON of a multiple of
 *     90 is snapped to it, so a slider that lands on 89.999° does not produce
 *     a fractional-pixel seam on what the user asked to be a quarter turn.
 *  2. A non-90° angle forces a canvas decision the 90° path never faces: the
 *     rotated rectangle's bounding box differs from the original, so either
 *     the canvas grows (`expand`, the only mode that loses no content — the
 *     default), the original box is kept and the overhang is cut (`crop`), or
 *     the rotated content is scaled to sit inside the original box (`fit`).
 *     Choosing silently is how a naive tool destroys image corners.
 *  3. Flip and rotate do not commute. `flipHorizontal + 90°` is a different
 *     image depending on which happened first, and the difference is
 *     invisible on symmetric test images. The order is therefore an explicit,
 *     documented input (`order`) and each stage is applied as its own pass
 *     over raw pixels, never left to an encoder's internal operation order.
 *  4. EXIF `Orientation` (1–8) is a pre-existing rotation the user already
 *     sees applied in their viewer. It is baked into the pixels *before* the
 *     requested transform, so "rotate 90°" is measured against what the user
 *     looks at rather than against the raw sensor grid, and the output
 *     carries no stale orientation tag. `exifOrientationHandled` reports it.
 *  5. Animated formats (GIF / APNG / animated WebP) are per-frame work with
 *     frame-timing to preserve. Out of scope for this single-image contract:
 *     rejected with a clear error rather than silently reduced to frame one.
 *  6. Geometry being lossless does not make the file lossless. A JPEG that is
 *     decoded, transposed and re-encoded takes a generation hit even at
 *     exactly 90°. `lossless` reports the geometry; `reencodeLossy` reports
 *     the codec, so neither claim has to carry the other's meaning.
 *
 * Specs implemented: CIPA DC-008-2019 (Exif 2.32) §4.6.4 tag 0x0112
 * `Orientation`, values 1–8 — resolved on load and normalised away on save;
 * ISO/IEC 10918-1 (JPEG), ISO/IEC 15948 (PNG), RFC 9649 (WebP) as the raster
 * container formats read and written. Pixel work runs through libvips/sharp.
 *
 * Pure and deterministic: bytes in, bytes out. No network, no filesystem, no
 * subprocess, no clock, no randomness.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── constants ─────────────────────────────────────────────────────────── */

/** A slider lands on 89.999° often; a user asking for a quarter turn does not. */
export const RIGHT_ANGLE_EPSILON = 0.01;
/** Decoded input ceiling. A 40 MP camera original fits; a video does not. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Guards a rotate that would allocate an absurd canvas. */
const MAX_DIMENSION = 20_000;

/** Formats this tool will decode. Vector and video inputs are out of scope. */
const INPUT_FORMATS = ["jpeg", "png", "webp", "gif", "tiff", "avif"] as const;
/** Formats this tool will encode. */
const OUTPUT_FORMATS = ["jpeg", "png", "webp", "gif", "tiff", "avif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** Generation loss on re-encode is a property of the codec, not the geometry. */
const LOSSY_CODECS = new Set<OutputFormat>(["jpeg", "webp", "avif"]);
/** Codecs that can carry the transparent corners an expanded canvas creates. */
const ALPHA_CODECS = new Set<OutputFormat>(["png", "webp", "gif", "tiff", "avif"]);

const CONTENT_TYPE: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  tiff: "image/tiff",
  avif: "image/avif",
};

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type FitMode = "expand" | "crop" | "fit";
export type TransformOrder = "flip-then-rotate" | "rotate-then-flip";

export interface ImageRotateFlipResult {
  /** The transformed file, base64 (no data-URL prefix). */
  imageBase64: string;
  contentType: string;
  bytes: number;
  format: OutputFormat;
  /** Post-transform canvas. Differs from the input on 90/270 and on expand. */
  width: number;
  height: number;
  /** Input canvas *after* EXIF orientation was resolved — what the user saw. */
  inputWidth: number;
  inputHeight: number;
  /** Requested angle after normalisation and right-angle snapping, 0..359.99. */
  angleApplied: number;
  /** True when the request was snapped onto an exact multiple of 90°. */
  snappedToRightAngle: boolean;
  /** "n/a" whenever the angle is a multiple of 90 — the choice cannot arise. */
  fitModeApplied: FitMode | "n/a";
  appliedOrder: TransformOrder;
  /** EXIF Orientation found on input (CIPA DC-008 tag 0x0112); 1 when absent. */
  exifOrientation: number;
  /** True when a non-default orientation was detected and baked in first. */
  exifOrientationHandled: boolean;
  /** Geometry claim: no resampling happened (angle is a multiple of 90). */
  lossless: boolean;
  /** Codec claim: the output container re-encodes lossily (JPEG/WebP/AVIF). */
  reencodeLossy: boolean;
  /** True when the transform introduced canvas pixels that were not in the input. */
  backgroundApplied: boolean;
  engine: string;
}

/* ── input schema (served to agents as JSON Schema over MCP + OpenAPI) ─── */

const HEX_RGBA = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const inputSchema = z.object({
  imageBase64: z
    .string()
    .min(1)
    .describe("Raster image bytes, base64. A `data:` URL prefix is accepted and stripped."),
  angle: z
    .number()
    .finite()
    .min(-180)
    .max(180)
    .default(0)
    .describe(
      "Rotation in degrees, positive = clockwise. Multiples of 90 are lossless; anything else resamples and triggers the fitMode decision.",
    ),
  flipHorizontal: z
    .boolean()
    .default(false)
    .describe("Mirror left-to-right (about the vertical axis)."),
  flipVertical: z
    .boolean()
    .default(false)
    .describe("Mirror top-to-bottom (about the horizontal axis)."),
  fitMode: z
    .enum(["expand", "crop", "fit"])
    .default("expand")
    .describe(
      "Canvas policy for a non-90 angle. expand: grow the canvas to hold everything (loses no content). crop: keep the input dimensions and cut the overhang. fit: scale the rotated content to sit inside the input dimensions. Ignored when the angle is a multiple of 90.",
    ),
  order: z
    .enum(["flip-then-rotate", "rotate-then-flip"])
    .default("flip-then-rotate")
    .describe(
      "Flip and rotate do not commute; this fixes which is applied first. Only observable when a flip and a non-180 rotation are both requested.",
    ),
  outputFormat: z
    .enum(OUTPUT_FORMATS)
    .optional()
    .describe("Output container. Defaults to the input format."),
  quality: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(90)
    .describe("Encoder quality for the lossy codecs (jpeg, webp, avif). Ignored by png/tiff/gif."),
  background: z
    .string()
    .regex(HEX_RGBA, "background must be #RRGGBB or #RRGGBBAA")
    .default("#ffffff00")
    .describe(
      "Fill for canvas pixels a non-90 rotation creates, #RRGGBB or #RRGGBBAA. The alpha is honoured by png/webp/gif/tiff/avif; a jpeg output flattens onto the RGB part.",
    ),
});

export type ImageRotateFlipInput = z.infer<typeof inputSchema>;

/* ── helpers ───────────────────────────────────────────────────────────── */

function stripDataUrl(b64: string): Buffer {
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  return Buffer.from(cleaned, "base64");
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export function parseHexColor(hex: string): Rgba {
  const body = hex.slice(1);
  const byte = (index: number) => Number.parseInt(body.slice(index * 2, index * 2 + 2), 16);
  return {
    r: byte(0),
    g: byte(1),
    b: byte(2),
    alpha: body.length === 8 ? byte(3) / 255 : 1,
  };
}

/**
 * 0..359.99…, with a multiple of 90 within RIGHT_ANGLE_EPSILON snapped onto it
 * (know-how #1). Returns the applied angle plus whether snapping happened, so
 * the caller can report the difference instead of hiding it.
 */
export function normalizeAngle(angle: number): {
  applied: number;
  snapped: boolean;
  rightAngle: boolean;
} {
  const wrapped = ((angle % 360) + 360) % 360;
  const nearest = Math.round(wrapped / 90) * 90;
  const delta = Math.abs(wrapped - nearest);
  if (delta <= RIGHT_ANGLE_EPSILON) {
    return { applied: nearest % 360, snapped: delta > 0, rightAngle: true };
  }
  return { applied: wrapped, snapped: false, rightAngle: false };
}

/** Axis-aligned bounding box of a w×h rectangle rotated by `deg`. */
export function rotatedBounds(
  width: number,
  height: number,
  deg: number,
): { width: number; height: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(height * cos + width * sin),
  };
}

/* ── sharp binding ─────────────────────────────────────────────────────── */

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

// biome-ignore lint/suspicious/noExplicitAny: sharp's chainable pipeline has no stable exported type here
type SharpPipeline = any;
type SharpFactory = (input?: Buffer, options?: Record<string, unknown>) => SharpPipeline;

async function loadSharp(): Promise<SharpFactory> {
  try {
    const mod = (await import("sharp")) as unknown as { default?: SharpFactory } & SharpFactory;
    return (mod.default ?? mod) as SharpFactory;
  } catch {
    throw new Error(
      "sharp is not installed. Add sharp to the host app (pnpm add sharp) for image tools.",
    );
  }
}

function fromRaw(sharp: SharpFactory, image: RawImage): SharpPipeline {
  return sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: image.channels },
  });
}

async function toRaw(pipeline: SharpPipeline): Promise<RawImage> {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/* ── stages ────────────────────────────────────────────────────────────── */

async function applyFlips(
  sharp: SharpFactory,
  image: RawImage,
  flipHorizontal: boolean,
  flipVertical: boolean,
): Promise<RawImage> {
  if (!flipHorizontal && !flipVertical) return image;
  let pipeline = fromRaw(sharp, image);
  // sharp names the horizontal mirror `flop` and the vertical one `flip`.
  if (flipHorizontal) pipeline = pipeline.flop();
  if (flipVertical) pipeline = pipeline.flip();
  return toRaw(pipeline);
}

async function applyRotation(
  sharp: SharpFactory,
  image: RawImage,
  angle: number,
  rightAngle: boolean,
  fitMode: FitMode,
  background: Rgba,
  needsAlpha: boolean,
): Promise<RawImage> {
  if (angle === 0) return image;

  const source =
    needsAlpha && image.channels < 4 ? await toRaw(fromRaw(sharp, image).ensureAlpha()) : image;

  const rotated = await toRaw(fromRaw(sharp, source).rotate(angle, { background }));
  // A right angle has no canvas decision to make: the bounding box *is* the
  // rotated rectangle (know-how #2), so every fit mode agrees here.
  if (rightAngle) return rotated;

  const targetW = image.width;
  const targetH = image.height;

  if (fitMode === "fit") {
    return toRaw(
      fromRaw(sharp, rotated).resize({
        width: targetW,
        height: targetH,
        fit: "inside",
        withoutEnlargement: true,
      }),
    );
  }

  if (fitMode === "crop") {
    // "Keep the input dimensions" must hold in both directions: a long thin
    // image rotated near 90° has a *smaller* bounding box on one axis, so the
    // deficit is padded with the same background before the centre crop.
    let pipeline = fromRaw(sharp, rotated);
    const padX = Math.max(0, targetW - rotated.width);
    const padY = Math.max(0, targetH - rotated.height);
    let padded = rotated;
    if (padX > 0 || padY > 0) {
      const left = Math.floor(padX / 2);
      const top = Math.floor(padY / 2);
      pipeline = pipeline.extend({
        left,
        right: padX - left,
        top,
        bottom: padY - top,
        background,
      });
      padded = await toRaw(pipeline);
      pipeline = fromRaw(sharp, padded);
    }
    return toRaw(
      pipeline.extract({
        left: Math.floor((padded.width - targetW) / 2),
        top: Math.floor((padded.height - targetH) / 2),
        width: targetW,
        height: targetH,
      }),
    );
  }

  return rotated;
}

async function encode(
  sharp: SharpFactory,
  image: RawImage,
  format: OutputFormat,
  quality: number,
  background: Rgba,
): Promise<Buffer> {
  let pipeline = fromRaw(sharp, image);
  if (!ALPHA_CODECS.has(format)) {
    // JPEG has no alpha channel: transparent canvas pixels must land on
    // something, and silently choosing black is the classic surprise.
    pipeline = pipeline.flatten({
      background: { r: background.r, g: background.g, b: background.b },
    });
  }
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality }).toBuffer();
    case "webp":
      return pipeline.webp({ quality }).toBuffer();
    case "avif":
      return pipeline.avif({ quality }).toBuffer();
    case "gif":
      return pipeline.gif().toBuffer();
    case "tiff":
      return pipeline.tiff().toBuffer();
    default:
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
  }
}

/* ── execute ───────────────────────────────────────────────────────────── */

export async function rotateFlipImage(input: ImageRotateFlipInput): Promise<ImageRotateFlipResult> {
  const buf = stripDataUrl(input.imageBase64);
  if (buf.byteLength === 0) throw new Error("imageBase64 decoded to zero bytes.");
  if (buf.byteLength > MAX_INPUT_BYTES) {
    throw new Error(
      `Image is ${Math.round(buf.byteLength / 1024 / 1024)} MB; the limit is ${MAX_INPUT_BYTES / 1024 / 1024} MB.`,
    );
  }

  const sharp = await loadSharp();

  let metadata: {
    format?: string;
    width?: number;
    height?: number;
    orientation?: number;
    pages?: number;
  };
  try {
    metadata = await sharp(buf).metadata();
  } catch {
    throw new Error("Could not read this file as an image.");
  }

  const inputFormat = metadata.format ?? "";
  if (!(INPUT_FORMATS as readonly string[]).includes(inputFormat)) {
    throw new Error(
      `Unsupported input format "${inputFormat || "unknown"}". Supported: ${INPUT_FORMATS.join(", ")}.`,
    );
  }
  if ((metadata.pages ?? 1) > 1) {
    // know-how #5: rotating frame one and calling it done is worse than saying no.
    throw new Error(
      "Animated images (GIF / APNG / animated WebP) are not supported — only the first frame would be transformed.",
    );
  }

  const exifOrientation = metadata.orientation ?? 1;
  const exifOrientationHandled = exifOrientation > 1;

  // know-how #4: resolve EXIF orientation into the pixels first, so the angle
  // the user asked for is measured against the image they are looking at.
  const oriented = await toRaw(sharp(buf).autoOrient());

  const angle = normalizeAngle(input.angle);
  const background = parseHexColor(input.background);
  const format: OutputFormat = input.outputFormat ?? (inputFormat as OutputFormat);
  const needsAlpha = !angle.rightAngle && background.alpha < 1 && ALPHA_CODECS.has(format);

  if (!angle.rightAngle && input.fitMode === "expand") {
    const bounds = rotatedBounds(oriented.width, oriented.height, angle.applied);
    if (bounds.width > MAX_DIMENSION || bounds.height > MAX_DIMENSION) {
      throw new Error(
        `Rotating this image by ${angle.applied}° would need a ${bounds.width}×${bounds.height} canvas; the limit is ${MAX_DIMENSION}px per side.`,
      );
    }
  }

  // know-how #3: two explicit passes, in the requested order — never two flags
  // handed to one encoder whose internal order is its own business.
  let working = oriented;
  if (input.order === "flip-then-rotate") {
    working = await applyFlips(sharp, working, input.flipHorizontal, input.flipVertical);
    working = await applyRotation(
      sharp,
      working,
      angle.applied,
      angle.rightAngle,
      input.fitMode,
      background,
      needsAlpha,
    );
  } else {
    working = await applyRotation(
      sharp,
      working,
      angle.applied,
      angle.rightAngle,
      input.fitMode,
      background,
      needsAlpha,
    );
    working = await applyFlips(sharp, working, input.flipHorizontal, input.flipVertical);
  }

  const out = await encode(sharp, working, format, input.quality, background);

  return {
    imageBase64: out.toString("base64"),
    contentType: CONTENT_TYPE[format],
    bytes: out.byteLength,
    format,
    width: working.width,
    height: working.height,
    inputWidth: oriented.width,
    inputHeight: oriented.height,
    angleApplied: angle.applied,
    snappedToRightAngle: angle.snapped,
    fitModeApplied: angle.rightAngle ? "n/a" : input.fitMode,
    appliedOrder: input.order,
    exifOrientation,
    exifOrientationHandled,
    // know-how #1 vs #6: geometry and codec are two separate claims.
    lossless: angle.rightAngle,
    reencodeLossy: LOSSY_CODECS.has(format),
    backgroundApplied: !angle.rightAngle,
    engine: "sharp",
  };
}

export const imageRotateFlipTool = tool({
  id: "image/image-rotate-flip",
  slug: "image-rotate-flip",
  category: "image",
  title: { zh: "图片旋转与翻转", en: "Rotate & Flip Image" },
  description: {
    zh: "按任意角度旋转、水平/垂直翻转图片：90 的倍数无重采样，非直角可选扩画布/裁切/缩放内嵌；加载时先解算 EXIF 方向，导出不留过期方向标签",
    en: "Rotate an image by any angle and mirror it horizontally or vertically: multiples of 90° resample nothing, other angles choose expand / crop / fit, and EXIF orientation is resolved on load so the rotation you ask for is the rotation you see",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.image_rotate_flip",
  roots: ["editor"],
  engine: {
    name: "forge-image-rotate-flip",
    upstream:
      "CIPA DC-008-2019 (Exif 2.32) §4.6.4 tag 0x0112 Orientation values 1–8 · ISO/IEC 10918-1 (JPEG) · ISO/IEC 15948 (PNG) · RFC 9649 (WebP) · pixel work via libvips/sharp",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "图片旋转,图片翻转,照片旋转90度,镜像翻转图片,在线旋转jpg,exif方向修正",
    en: "rotate image online, flip image online, rotate picture 90 degrees, mirror image, flip photo horizontal, rotate jpg, exif orientation fix",
  },
  inputSchema,
  execute: (input: ImageRotateFlipInput) => rotateFlipImage(input),
});

export const w3ImageRotateFlipTools: readonly AnyForgeToolDefinition[] = [imageRotateFlipTool];

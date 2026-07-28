import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

const BufferInput = z.object({
  imageBase64: z.string().min(1),
  format: z.enum(["jpeg", "png", "webp"]).default("webp"),
  quality: z.number().int().min(1).max(100).default(80),
  width: z.number().int().min(1).max(8192).optional(),
  height: z.number().int().min(1).max(8192).optional(),
});

export type ImageOpsInput = z.infer<typeof BufferInput>;

export interface ImageOpsOutput {
  readonly contentType: string;
  readonly base64: string;
  readonly bytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly engine: string;
}

function stripDataUrl(b64: string): Buffer {
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  return Buffer.from(cleaned, "base64");
}

type SharpFactory = (input?: Buffer) => {
  resize: (opts: Record<string, unknown>) => unknown;
  jpeg: (opts: { quality: number }) => { toBuffer: () => Promise<Buffer> };
  png: (opts: { compressionLevel: number }) => { toBuffer: () => Promise<Buffer> };
  webp: (opts: { quality: number }) => { toBuffer: () => Promise<Buffer> };
  metadata: () => Promise<{ width?: number; height?: number }>;
  toBuffer: () => Promise<Buffer>;
};

async function loadSharp(): Promise<SharpFactory> {
  try {
    const mod = (await import("sharp")) as unknown as {
      default?: SharpFactory;
    } & SharpFactory;
    return (mod.default ?? mod) as SharpFactory;
  } catch {
    throw new Error(
      "sharp is not installed. Add sharp to the host app (pnpm add sharp) for image tools.",
    );
  }
}

async function runImageTransform(
  input: ImageOpsInput,
  mode: "compress" | "resize" | "convert",
): Promise<ImageOpsOutput> {
  const sharp = await loadSharp();
  const buf = stripDataUrl(input.imageBase64);
  // pipeline is sharp instance; chain methods return same shape
  // biome-ignore lint/suspicious/noExplicitAny: sharp dynamic import lacks stable chain type here
  let pipeline: any = sharp(buf);
  const format = input.format ?? "webp";
  const quality = input.quality ?? 80;

  if (mode === "resize" || input.width || input.height) {
    pipeline = pipeline.resize({
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let out: Buffer;
  if (format === "jpeg") {
    out = await pipeline.jpeg({ quality }).toBuffer();
  } else if (format === "png") {
    out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  } else {
    out = await pipeline.webp({ quality }).toBuffer();
  }

  const meta = await sharp(out).metadata();
  return {
    contentType: `image/${format === "jpeg" ? "jpeg" : format}`,
    base64: out.toString("base64"),
    bytes: out.length,
    ...(meta.width !== undefined ? { width: meta.width } : {}),
    ...(meta.height !== undefined ? { height: meta.height } : {}),
    engine: "sharp",
  };
}

function imageTool(opts: {
  id: string;
  slug: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  meterId: string;
  seoKeywords: { zh: string; en: string };
  mode: "compress" | "resize" | "convert";
  roots?: readonly string[];
}): AnyForgeToolDefinition {
  return {
    id: opts.id,
    slug: opts.slug,
    category: "image",
    title: opts.title,
    description: opts.description,
    tier: "job",
    sideEffect: "pure",
    runtime: ["server"],
    meterId: opts.meterId,
    engine: { name: "sharp", upstream: "lovell/sharp", version: "0.34.x" },
    seoKeywords: opts.seoKeywords,
    ...(opts.roots ? { roots: opts.roots } : {}),
    inputSchema: BufferInput,
    unitCost: 0,
    execute: (input: ImageOpsInput) => runImageTransform(input, opts.mode),
  } as AnyForgeToolDefinition;
}

export const imageCompressTool = imageTool({
  id: "image/compress",
  slug: "image-compress",
  title: { zh: "图片压缩", en: "Image Compress" },
  description: { zh: "压缩图片体积（sharp）", en: "Compress images via sharp" },
  meterId: "forge.image.compress",
  seoKeywords: { zh: "图片压缩在线", en: "compress image online" },
  mode: "compress",
  roots: ["optimizer"],
});

export const imageResizeTool = imageTool({
  id: "image/resize",
  slug: "image-resize",
  title: { zh: "图片缩放", en: "Image Resize" },
  description: { zh: "按宽高缩放图片（sharp）", en: "Resize images via sharp" },
  meterId: "forge.image.resize",
  seoKeywords: { zh: "图片缩放在线", en: "resize image online" },
  mode: "resize",
  roots: ["converter", "optimizer"],
});

export const imageConvertTool = imageTool({
  id: "image/convert",
  slug: "image-convert",
  title: { zh: "图片格式转换", en: "Image Convert" },
  description: { zh: "png/jpeg/webp 互转（sharp）", en: "Convert between png/jpeg/webp" },
  meterId: "forge.image.convert",
  seoKeywords: { zh: "图片格式转换", en: "convert image format online" },
  mode: "convert",
  roots: ["converter"],
});

export const imageTools: readonly AnyForgeToolDefinition[] = [
  imageCompressTool,
  imageResizeTool,
  imageConvertTool,
];

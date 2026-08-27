/**
 * Wave-5 matrix hard gaps: pdf-text, image-crop, svg-optimize, router-translate shell.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

const execFileAsync = promisify(execFile);

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

function stripDataUrl(b64: string): Buffer {
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  return Buffer.from(cleaned, "base64");
}

async function which(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [bin], { timeout: 5_000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// ── PDF text extract (pdftotext / poppler) ───────────────────────────────────

export const pdfTextTool = tool({
  id: "doc/pdf-text",
  slug: "pdf-text",
  category: "doc",
  title: { zh: "PDF 文本提取", en: "PDF Text Extract" },
  description: {
    zh: "pdftotext（poppler）提取 PDF 文本；无二进制则诚实失败",
    en: "Extract PDF text via pdftotext (poppler); fails honestly if missing",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.pdf_text",
  roots: ["extractor", "viewer"],
  engine: {
    name: "pdftotext",
    upstream: "poppler-utils pdftotext",
    version: "host",
  },
  seoKeywords: {
    zh: "pdf提取文字,pdf转文本,pdf text extract",
    en: "pdf text extract online, extract text from pdf, pdf to text",
  },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
    layout: z.enum(["raw", "layout"]).default("layout"),
    maxChars: z.coerce.number().int().min(100).max(2_000_000).default(200_000),
  }),
  execute: async (input: { fileBase64: string; layout?: "raw" | "layout"; maxChars?: number }) => {
    const bin = await which("pdftotext");
    if (!bin) {
      throw new Error(
        "pdftotext not found. Install poppler-utils on the host (dnf install -y poppler-utils).",
      );
    }
    const raw = stripDataUrl(input.fileBase64);
    const dir = await mkdtemp(join(tmpdir(), "forge-pdftxt-"));
    const pdfPath = join(dir, "in.pdf");
    const txtPath = join(dir, "out.txt");
    try {
      await writeFile(pdfPath, raw);
      const args =
        input.layout === "raw"
          ? ["-raw", "-enc", "UTF-8", pdfPath, txtPath]
          : ["-layout", "-enc", "UTF-8", pdfPath, txtPath];
      await execFileAsync(bin, args, { timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });
      let text = await readFile(txtPath, "utf8");
      const maxChars = input.maxChars ?? 200_000;
      const truncated = text.length > maxChars;
      if (truncated) text = text.slice(0, maxChars);
      return {
        text,
        chars: text.length,
        truncated,
        layout: input.layout ?? "layout",
        bytesIn: raw.byteLength,
        engine: "pdftotext",
      };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  },
});

// ── Image crop (sharp) ──────────────────────────────────────────────────────

export const imageCropTool = tool({
  id: "image/image-crop",
  slug: "image-crop",
  category: "image",
  title: { zh: "图片裁剪", en: "Image Crop" },
  description: {
    zh: "按 left/top/width/height 裁剪（sharp）",
    en: "Crop image by left/top/width/height via sharp",
  },
  tier: "job",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.crop",
  roots: ["editor", "converter"],
  engine: { name: "sharp", upstream: "lovell/sharp", version: "0.34.x" },
  seoKeywords: {
    zh: "图片裁剪在线,crop image",
    en: "crop image online, image crop tool",
  },
  inputSchema: z.object({
    imageBase64: z.string().min(1),
    left: z.coerce.number().int().min(0).default(0),
    top: z.coerce.number().int().min(0).default(0),
    width: z.coerce.number().int().min(1).max(8192),
    height: z.coerce.number().int().min(1).max(8192),
    format: z.enum(["jpeg", "png", "webp"]).default("png"),
  }),
  execute: async (input: {
    imageBase64: string;
    left?: number;
    top?: number;
    width: number;
    height: number;
    format?: "jpeg" | "png" | "webp";
  }) => {
    const buf = stripDataUrl(input.imageBase64);
    const sharpMod = (await import("sharp")) as unknown as {
      default?: (input?: Buffer) => {
        extract: (region: { left: number; top: number; width: number; height: number }) => {
          jpeg: (o: { quality: number }) => { toBuffer: () => Promise<Buffer> };
          png: () => { toBuffer: () => Promise<Buffer> };
          webp: (o: { quality: number }) => { toBuffer: () => Promise<Buffer> };
          metadata: () => Promise<{ width?: number; height?: number }>;
        };
        metadata: () => Promise<{ width?: number; height?: number }>;
      };
    } & ((input?: Buffer) => {
      extract: (region: { left: number; top: number; width: number; height: number }) => {
        jpeg: (o: { quality: number }) => { toBuffer: () => Promise<Buffer> };
        png: () => { toBuffer: () => Promise<Buffer> };
        webp: (o: { quality: number }) => { toBuffer: () => Promise<Buffer> };
      };
      metadata: () => Promise<{ width?: number; height?: number }>;
    });
    const sharp = sharpMod.default ?? sharpMod;
    const meta = await sharp(buf).metadata();
    const left = input.left ?? 0;
    const top = input.top ?? 0;
    const maxW = meta.width ?? left + input.width;
    const maxH = meta.height ?? top + input.height;
    if (left + input.width > maxW || top + input.height > maxH) {
      throw new Error(
        `Crop region out of bounds (image ${maxW}×${maxH}, region ${left},${top} ${input.width}×${input.height})`,
      );
    }
    const pipeline = sharp(buf).extract({
      left,
      top,
      width: input.width,
      height: input.height,
    });
    const format = input.format ?? "png";
    let out: Buffer;
    let contentType: string;
    if (format === "jpeg") {
      out = await pipeline.jpeg({ quality: 90 }).toBuffer();
      contentType = "image/jpeg";
    } else if (format === "webp") {
      out = await pipeline.webp({ quality: 90 }).toBuffer();
      contentType = "image/webp";
    } else {
      out = await pipeline.png().toBuffer();
      contentType = "image/png";
    }
    return {
      contentType,
      base64: out.toString("base64"),
      bytes: out.length,
      width: input.width,
      height: input.height,
      sourceWidth: meta.width ?? null,
      sourceHeight: meta.height ?? null,
      engine: "sharp",
    };
  },
});

// ── SVG optimize (SVGO — industry SOTA vector optimisations) ────────────────

export const svgOptimizeTool = tool({
  id: "image/svg-optimize",
  slug: "svg-optimize",
  category: "image",
  title: { zh: "SVG 优化", en: "SVG Optimize" },
  description: {
    zh: "SVGO multipass 优化：去冗余、合并路径、压缩属性",
    en: "SVGO multipass optimise — strip dead weight, merge paths, compress attributes",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.svg_optimize",
  roots: ["optimizer"],
  engine: {
    name: "svgo",
    upstream: "https://github.com/svg/svgo",
    version: "4.x",
  },
  seoKeywords: {
    zh: "svg压缩,svg优化,svg minify,svgo",
    en: "svg optimizer online, minify svg, compress svg, svgo",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(2_000_000),
  }),
  execute: async (input: { text: string }) => {
    if (!/<svg[\s>]/i.test(input.text)) {
      throw new Error("Input does not look like SVG (missing <svg>)");
    }
    const { optimize } = await import("svgo");
    const out = optimize(input.text, { multipass: true });
    const result = out.data;
    return {
      result,
      bytesIn: input.text.length,
      bytesOut: result.length,
      saved: Math.max(0, input.text.length - result.length),
      engine: "svgo",
    };
  },
});

// ── Router translator shell (external) ──────────────────────────────────────

export const routerTranslateTool = tool({
  id: "llm/router-translate",
  slug: "router-translate",
  category: "llm",
  title: { zh: "翻译（经 Router）", en: "Translate via Router" },
  description: {
    zh: "Router 翻译壳：返回 deep link / 调用提示；不计静默第二账本",
    en: "Router translation shell: deep link + invoke hints; no silent second ledger",
  },
  tier: "catalog",
  sideEffect: "external",
  runtime: ["server"],
  meterId: "forge.llm.router_translate",
  roots: ["converter"],
  engine: {
    name: "nebutra-router-shell",
    upstream: "router.nebutra.com (model meter)",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "在线翻译,ai翻译,router翻译",
    en: "ai translate online, translate via router, llm translator",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(20_000),
    sourceLang: z.string().min(2).max(16).default("auto"),
    targetLang: z.string().min(2).max(16).default("en"),
  }),
  execute: (input: { text: string; sourceLang?: string; targetLang?: string }) => {
    const sourceLang = input.sourceLang ?? "auto";
    const targetLang = input.targetLang ?? "en";
    const base = (
      process.env.NEXT_PUBLIC_ROUTER_URL ||
      process.env.ROUTER_URL ||
      "https://router.nebutra.com"
    ).replace(/\/$/, "");
    const prompt = `Translate from ${sourceLang} to ${targetLang}:\n\n${input.text}`;
    const deepLink = `${base}/?q=${encodeURIComponent(prompt)}`;
    return {
      translated: null as string | null,
      sourceLang,
      targetLang,
      chars: input.text.length,
      via: "router",
      deepLink,
      invokeHint: {
        method: "POST",
        path: `${base}/v1/chat/completions`,
        note: "Use Router API key + model meter. Forge does not proxy LLM tokens here.",
      },
      note: "Shell only — open deepLink or call Router with your key. No silent second ledger on Forge.",
      engine: "nebutra-router-shell",
    };
  },
});

/**
 * Hard-correct: `routerTranslateTool` shell stays deferred until W6 real Router invoke.
 * svgOptimizeTool re-entered on SVGO (2026-08-03).
 */
export const wave5SotaGapTools: readonly AnyForgeToolDefinition[] = [
  pdfTextTool,
  imageCropTool,
  svgOptimizeTool,
];

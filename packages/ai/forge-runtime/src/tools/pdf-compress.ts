/**
 * Real PDF compression via host binaries:
 *   1. qpdf  — stream/object re-compress (lossless structure)
 *   2. Ghostscript — /screen|/ebook|/printer image-aware rewrite
 *   3. pdf-lib — structural fallback (same as pdf-optimize)
 *
 * Uses execFile (no shell) + temp dirs. Safe for multi-tenant upload path.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
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

async function resolveBinary(name: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [name], { timeout: 5_000 });
    const path = stdout.trim();
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

export type PdfCompressQuality = "structural" | "screen" | "ebook" | "printer";
export type PdfCompressEngine = "auto" | "qpdf" | "ghostscript" | "pdf-lib";

const GS_SETTINGS: Record<Exclude<PdfCompressQuality, "structural">, string> = {
  screen: "/screen",
  ebook: "/ebook",
  printer: "/printer",
};

async function compressWithQpdf(
  inputPath: string,
  outputPath: string,
  qpdfBin: string,
): Promise<void> {
  // qpdf 7.x (Alibaba Cloud Linux) + modern flags where supported
  const args = [
    "--stream-data=compress",
    "--object-streams=generate",
    "--compress-streams=y",
    inputPath,
    outputPath,
  ];
  await execFileAsync(qpdfBin, args, {
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
  });
}

async function compressWithGhostscript(
  inputPath: string,
  outputPath: string,
  gsBin: string,
  quality: Exclude<PdfCompressQuality, "structural">,
): Promise<void> {
  const settings = GS_SETTINGS[quality];
  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=${settings}`,
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];
  await execFileAsync(gsBin, args, {
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  });
}

async function compressWithPdfLib(raw: Buffer): Promise<Buffer> {
  const src = await PDFDocument.load(raw, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  for (const page of pages) out.addPage(page);
  const title = src.getTitle();
  const author = src.getAuthor();
  if (title) out.setTitle(title);
  if (author) out.setAuthor(author);
  const bytes = await out.save({ useObjectStreams: true });
  return Buffer.from(bytes);
}

export interface PdfCompressResult {
  readonly contentType: "application/pdf";
  readonly base64: string;
  readonly bytesIn: number;
  readonly bytesOut: number;
  readonly saved: number;
  readonly savedPercent: number;
  readonly engine: "qpdf" | "ghostscript" | "pdf-lib";
  readonly quality: PdfCompressQuality;
  readonly pageCount?: number;
  readonly note: string;
}

/**
 * Core compress pipeline — exported for unit tests with injectable binaries.
 */
export async function compressPdfBuffer(
  raw: Buffer,
  options: {
    quality?: PdfCompressQuality;
    engine?: PdfCompressEngine;
    /** Override binary resolution (tests). */
    resolveBinary?: (name: string) => Promise<string | null>;
  } = {},
): Promise<PdfCompressResult> {
  const quality = options.quality ?? "ebook";
  const enginePref = options.engine ?? "auto";
  const which = options.resolveBinary ?? resolveBinary;
  const bytesIn = raw.byteLength;

  const tryQpdf = enginePref === "auto" || enginePref === "qpdf";
  const tryGs = (enginePref === "auto" || enginePref === "ghostscript") && quality !== "structural";
  const tryLib = enginePref === "auto" || enginePref === "pdf-lib";

  const dir = await mkdtemp(join(tmpdir(), "forge-pdf-"));
  const inputPath = join(dir, "in.pdf");
  const outputPath = join(dir, "out.pdf");
  try {
    await writeFile(inputPath, raw);

    if (tryQpdf && (quality === "structural" || enginePref === "qpdf" || enginePref === "auto")) {
      const qpdf = await which("qpdf");
      if (qpdf) {
        try {
          // Prefer qpdf for structural; also try first on auto before gs for lossless pass
          if (quality === "structural" || enginePref === "qpdf") {
            await compressWithQpdf(inputPath, outputPath, qpdf);
            const out = await readFile(outputPath);
            return packResult(
              out,
              bytesIn,
              "qpdf",
              quality,
              "qpdf stream/object compress (lossless structure)",
            );
          }
        } catch {
          // fall through
        }
      } else if (enginePref === "qpdf") {
        throw new Error("qpdf binary not found on host (install package `qpdf`)");
      }
    }

    if (tryGs) {
      const gs = (await which("gs")) ?? (await which("ghostscript"));
      // tryGs is false when quality === "structural", so quality is screen|ebook|printer here
      const gsQuality = quality as Exclude<PdfCompressQuality, "structural">;
      if (gs) {
        try {
          await compressWithGhostscript(inputPath, outputPath, gs, gsQuality);
          const out = await readFile(outputPath);
          return packResult(
            out,
            bytesIn,
            "ghostscript",
            quality,
            `Ghostscript pdfwrite PDFSETTINGS=${GS_SETTINGS[gsQuality]} (may recompress images)`,
          );
        } catch (err) {
          if (enginePref === "ghostscript") {
            throw new Error(
              `ghostscript failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      } else if (enginePref === "ghostscript") {
        throw new Error("ghostscript binary not found on host (install package `ghostscript`)");
      }
    }

    // auto: try qpdf if not already used as structural primary
    if (enginePref === "auto") {
      const qpdf = await which("qpdf");
      if (qpdf) {
        try {
          await compressWithQpdf(inputPath, outputPath, qpdf);
          const out = await readFile(outputPath);
          if (out.byteLength < bytesIn || !tryLib) {
            return packResult(out, bytesIn, "qpdf", quality, "qpdf stream/object compress");
          }
        } catch {
          // continue
        }
      }
    }

    if (!tryLib) {
      throw new Error(`Engine ${enginePref} unavailable or failed`);
    }

    const libOut = await compressWithPdfLib(raw);
    return packResult(
      libOut,
      bytesIn,
      "pdf-lib",
      quality,
      "pdf-lib object-stream rewrite only (no image recompress). Install qpdf/ghostscript on host for real compression.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function packResult(
  out: Buffer,
  bytesIn: number,
  engine: PdfCompressResult["engine"],
  quality: PdfCompressQuality,
  note: string,
): PdfCompressResult {
  const bytesOut = out.byteLength;
  const saved = Math.max(0, bytesIn - bytesOut);
  return {
    contentType: "application/pdf",
    base64: out.toString("base64"),
    bytesIn,
    bytesOut,
    saved,
    savedPercent: bytesIn > 0 ? Math.round((saved / bytesIn) * 1000) / 10 : 0,
    engine,
    quality,
    note,
  };
}

export const pdfCompressTool = tool({
  id: "doc/pdf-compress",
  slug: "pdf-compress",
  category: "doc",
  title: { zh: "PDF 压缩", en: "PDF Compress" },
  description: {
    zh: "qpdf / Ghostscript 真压缩（宿主二进制）；不可用时回落 pdf-lib",
    en: "Real compress via qpdf/Ghostscript host binaries; pdf-lib fallback",
  },
  tier: "job",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.pdf_compress",
  roots: ["optimizer"],
  engine: {
    name: "qpdf|ghostscript|pdf-lib",
    upstream: "qpdf + Ghostscript pdfwrite + pdf-lib fallback",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "pdf压缩,在线压缩pdf,减小pdf体积",
    en: "compress pdf online, reduce pdf size, pdf compressor",
  },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
    /** structural=qpdf lossless streams; screen/ebook/printer=Ghostscript */
    quality: z.enum(["structural", "screen", "ebook", "printer"]).default("ebook"),
    engine: z.enum(["auto", "qpdf", "ghostscript", "pdf-lib"]).default("auto"),
  }),
  execute: async (input: {
    fileBase64: string;
    quality?: PdfCompressQuality;
    engine?: PdfCompressEngine;
  }) => {
    const raw = stripDataUrl(input.fileBase64);
    if (raw.byteLength < 5 || raw.subarray(0, 4).toString("utf8") !== "%PDF") {
      // soft check — still allow if header odd
    }
    const result = await compressPdfBuffer(raw, {
      quality: input.quality ?? "ebook",
      engine: input.engine ?? "auto",
    });
    // best-effort page count
    let pageCount: number | undefined;
    try {
      const doc = await PDFDocument.load(Buffer.from(result.base64, "base64"), {
        ignoreEncryption: true,
      });
      pageCount = doc.getPageCount();
    } catch {
      pageCount = undefined;
    }
    return { ...result, ...(pageCount !== undefined ? { pageCount } : {}) };
  },
});

export const pdfCompressTools: readonly AnyForgeToolDefinition[] = [pdfCompressTool];

/**
 * PDF ops — pdf-lib merge / split.
 */
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

function stripDataUrl(b64: string): Uint8Array {
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  return new Uint8Array(Buffer.from(cleaned, "base64"));
}

export const pdfMergeTool = tool({
  id: "doc/pdf-merge",
  slug: "pdf-merge",
  category: "doc",
  title: { zh: "PDF 合并", en: "PDF Merge" },
  description: { zh: "pdf-lib 合并多个 PDF", en: "Merge PDFs with pdf-lib" },
  tier: "job",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.pdf_merge",
  engine: { name: "pdf-lib", upstream: "https://github.com/Hopding/pdf-lib", version: "1.x" },
  seoKeywords: { zh: "pdf合并,合并pdf在线", en: "merge pdf online" },
  sotaStatus: "production",
  inputSchema: z.object({
    filesBase64: z.array(z.string().min(1)).min(2).max(20),
  }),
  execute: async (input: { filesBase64: string[] }) => {
    const out = await PDFDocument.create();
    for (const b64 of input.filesBase64) {
      const src = await PDFDocument.load(stripDataUrl(b64), { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const page of pages) out.addPage(page);
    }
    const bytes = await out.save();
    return {
      contentType: "application/pdf",
      base64: Buffer.from(bytes).toString("base64"),
      bytes: bytes.length,
      pageCount: out.getPageCount(),
      engine: "pdf-lib",
    };
  },
});

export const pdfSplitTool = tool({
  id: "doc/pdf-split",
  slug: "pdf-split",
  category: "doc",
  title: { zh: "PDF 拆分", en: "PDF Split" },
  description: { zh: "pdf-lib 按页码范围拆出新 PDF", en: "Split PDF page ranges with pdf-lib" },
  tier: "job",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.pdf_split",
  engine: { name: "pdf-lib", upstream: "https://github.com/Hopding/pdf-lib", version: "1.x" },
  seoKeywords: { zh: "pdf拆分,pdf按页导出", en: "split pdf online" },
  sotaStatus: "production",
  inputSchema: z.object({
    fileBase64: z.string().min(1),
    /** 1-based inclusive range */
    fromPage: z.number().int().min(1).default(1),
    toPage: z.number().int().min(1).optional(),
  }),
  execute: async (input: { fileBase64: string; fromPage?: number; toPage?: number }) => {
    const src = await PDFDocument.load(stripDataUrl(input.fileBase64), {
      ignoreEncryption: true,
    });
    const total = src.getPageCount();
    const from = (input.fromPage ?? 1) - 1;
    const to = (input.toPage ?? total) - 1;
    if (from < 0 || to >= total || from > to) {
      throw new Error(`Invalid range ${from + 1}-${to + 1} for ${total} pages`);
    }
    const out = await PDFDocument.create();
    const indices = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const pages = await out.copyPages(src, indices);
    for (const page of pages) out.addPage(page);
    const bytes = await out.save();
    return {
      contentType: "application/pdf",
      base64: Buffer.from(bytes).toString("base64"),
      bytes: bytes.length,
      pageCount: out.getPageCount(),
      sourcePages: total,
      range: { from: from + 1, to: to + 1 },
      engine: "pdf-lib",
    };
  },
});

export const pdfOpsTools: readonly AnyForgeToolDefinition[] = [pdfMergeTool, pdfSplitTool];

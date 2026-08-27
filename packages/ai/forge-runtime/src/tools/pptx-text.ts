/**
 * PPTX outline extract via pure ZIP (no PowerPoint).
 * Reads ppt/slides/slideN.xml and strips text runs.
 */
import { inflateRawSync } from "node:zlib";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

function stripDataUrl(b64: string): Buffer {
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  return Buffer.from(cleaned.replace(/\s/g, ""), "base64");
}

function listZipEntries(buf: Buffer): Array<{ name: string; data: Buffer }> {
  const out: Array<{ name: string; data: Buffer }> = [];
  let offset = 0;
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const compression = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.subarray(nameStart, nameStart + nameLen).toString("utf8");
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) break;
    const raw = buf.subarray(dataStart, dataEnd);
    let data: Buffer;
    if (compression === 0) data = Buffer.from(raw);
    else if (compression === 8) {
      try {
        data = inflateRawSync(raw, {
          maxOutputLength: Math.max(uncompSize, 1) + 2 * 1024 * 1024,
        });
      } catch {
        data = inflateRawSync(raw);
      }
    } else {
      offset = dataEnd;
      continue;
    }
    out.push({ name: name.replace(/\\/g, "/"), data });
    offset = dataEnd;
  }
  return out;
}

function slideXmlToText(xml: string): string {
  const parts: string[] = [];
  const re = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    parts.push(
      (m[1] ?? "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    );
  }
  // join with spaces; paragraph breaks when consecutive runs separated by </a:p>
  return parts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function slideSortKey(name: string): number {
  const m = /slide(\d+)\.xml$/i.exec(name);
  return m ? Number(m[1]) : 9999;
}

export const pptxTextTool = tool({
  id: "doc/pptx-text",
  slug: "pptx-text",
  category: "doc",
  title: { zh: "PPTX 大纲提取", en: "PPTX Outline Extract" },
  description: {
    zh: "从 .pptx 提取每页文字大纲（ZIP + slide XML，无需 PowerPoint）",
    en: "Extract per-slide text outline from .pptx (ZIP + slide XML, no PowerPoint)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.pptx_text",
  roots: ["extractor", "viewer"],
  engine: {
    name: "pure-zip",
    upstream: "Node zlib inflateRaw + OOXML a:t runs",
    version: "0",
  },
  seoKeywords: {
    zh: "pptx提取文字,ppt大纲,pptx text extract",
    en: "pptx text extract online, powerpoint outline, extract text from pptx",
  },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
  }),
  execute: async (input: { fileBase64: string }) => {
    const raw = stripDataUrl(input.fileBase64);
    if (raw.length < 4 || raw.readUInt32LE(0) !== 0x04034b50) {
      throw new Error("Not a valid PPTX/ZIP package");
    }
    const entries = listZipEntries(raw);
    const slides = entries
      .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name))
      .sort((a, b) => slideSortKey(a.name) - slideSortKey(b.name));
    if (slides.length === 0) {
      throw new Error("No ppt/slides/slideN.xml found — is this a .pptx?");
    }
    const outline = slides.map((s, i) => {
      const text = slideXmlToText(s.data.toString("utf8"));
      return { slide: i + 1, text };
    });
    const text = outline.map((o) => `## Slide ${o.slide}\n${o.text || "(empty)"}`).join("\n\n");
    return {
      text,
      slides: outline.length,
      outline,
      engine: "pure-zip+a:t",
    };
  },
});

export const pptxTextTools = [pptxTextTool];

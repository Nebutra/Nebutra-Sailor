/**
 * DOCX → plain text via pure ZIP inflate (no Office suite / no mammoth).
 * Reads word/document.xml from the package and strips tags.
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

function findZipEntry(buf: Buffer, path: string): Buffer | null {
  const nameBuf = Buffer.from(path, "utf8");
  let offset = 0;
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const compression = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.subarray(nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) return null;
    if (name.equals(nameBuf)) {
      const data = buf.subarray(dataStart, dataEnd);
      if (compression === 0) return Buffer.from(data);
      if (compression === 8) {
        try {
          return inflateRawSync(data, {
            maxOutputLength: Math.max(uncompSize, 1) + 1024 * 1024,
          });
        } catch {
          return inflateRawSync(data);
        }
      }
      return null;
    }
    offset = dataEnd;
  }
  return null;
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\b[^/]*\/>/g, "\t")
    .replace(/<w:br\b[^/]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const docxTextTool = tool({
  id: "doc/docx-text",
  slug: "docx-text",
  category: "doc",
  title: { zh: "DOCX 提取文本", en: "DOCX Text Extract" },
  description: {
    zh: "从 .docx 提取纯文本（ZIP + document.xml，无需 Office）",
    en: "Extract plain text from .docx (ZIP + document.xml, no Office suite)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.docx_text",
  roots: ["extractor", "converter"],
  engine: {
    name: "pure-zip",
    upstream: "Node zlib inflateRaw + OOXML document.xml",
    version: "0",
  },
  seoKeywords: {
    zh: "docx提取文字,word转文本,docx text extract",
    en: "docx text extract online, word to text, extract text from docx",
  },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
  }),
  execute: async (input: { fileBase64: string }) => {
    const raw = stripDataUrl(input.fileBase64);
    if (raw.length < 4 || raw.readUInt32LE(0) !== 0x04034b50) {
      throw new Error("Not a valid DOCX/ZIP package");
    }
    const xmlBuf = findZipEntry(raw, "word/document.xml");
    if (!xmlBuf) {
      throw new Error("word/document.xml not found — is this a .docx?");
    }
    const text = xmlToText(xmlBuf.toString("utf8"));
    return {
      text,
      chars: text.length,
      engine: "pure-zip+document.xml",
    };
  },
});

export const docxTextTools = [docxTextTool];

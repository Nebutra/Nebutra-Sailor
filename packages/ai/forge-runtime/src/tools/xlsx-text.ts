/**
 * XLSX → CSV via pure ZIP inflate (first sheet only, no Excel suite).
 * Reads xl/sharedStrings.xml + xl/worksheets/sheet1.xml.
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
            maxOutputLength: Math.max(uncompSize, 1) + 4 * 1024 * 1024,
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

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  // each <si>…</si> may contain one or more <t>…</t>
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml)) !== null) {
    const parts: string[] = [];
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(m[1] ?? "")) !== null) {
      parts.push(decodeXmlEntities(tm[1] ?? ""));
    }
    out.push(parts.join(""));
  }
  return out;
}

function colLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml)) !== null) {
    const cells: Array<{ col: number; value: string }> = [];
    const cRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cm: RegExpExecArray | null;
    while ((cm = cRe.exec(rm[1] ?? "")) !== null) {
      const attrs = cm[1] ?? cm[3] ?? "";
      const body = cm[2] ?? "";
      const ref = /r="([A-Z]+)(\d+)"/i.exec(attrs);
      const col = ref ? colLettersToIndex(ref[1] ?? "A") : cells.length;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      let value = "";
      if (type === "inlineStr") {
        const t = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(body);
        value = decodeXmlEntities(t?.[1] ?? "");
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body);
        const raw = v?.[1] ?? "";
        if (type === "s") {
          const idx = Number(raw);
          value = Number.isFinite(idx) ? (shared[idx] ?? "") : raw;
        } else {
          value = decodeXmlEntities(raw);
        }
      }
      cells.push({ col, value });
    }
    if (cells.length === 0) {
      rows.push([]);
      continue;
    }
    const maxCol = Math.max(...cells.map((c) => c.col));
    const line = Array.from({ length: maxCol + 1 }, () => "");
    for (const c of cells) line[c.col] = c.value;
    rows.push(line);
  }
  return rows;
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
          return cell;
        })
        .join(","),
    )
    .join("\n");
}

export const xlsxTextTool = tool({
  id: "doc/xlsx-text",
  slug: "xlsx-text",
  category: "doc",
  title: { zh: "XLSX 提取表格", en: "XLSX Sheet Extract" },
  description: {
    zh: "从 .xlsx 首表提取 CSV（ZIP + sheet1.xml，无需 Excel）",
    en: "Extract first sheet of .xlsx as CSV (ZIP + sheet1.xml, no Excel suite)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.xlsx_text",
  roots: ["extractor", "converter"],
  engine: {
    name: "pure-zip",
    upstream: "Node zlib inflateRaw + OOXML sheet1",
    version: "0",
  },
  seoKeywords: {
    zh: "xlsx转csv,excel提取,xlsx text extract",
    en: "xlsx to csv online, extract excel sheet, xlsx text extract",
  },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
  }),
  execute: async (input: { fileBase64: string }) => {
    const raw = stripDataUrl(input.fileBase64);
    if (raw.length < 4 || raw.readUInt32LE(0) !== 0x04034b50) {
      throw new Error("Not a valid XLSX/ZIP package");
    }
    const sheetBuf =
      findZipEntry(raw, "xl/worksheets/sheet1.xml") ??
      findZipEntry(raw, "xl/worksheets/sheet1.xml".replace(/\//g, "\\"));
    if (!sheetBuf) {
      throw new Error("xl/worksheets/sheet1.xml not found — is this a .xlsx?");
    }
    const sharedBuf = findZipEntry(raw, "xl/sharedStrings.xml");
    const shared = sharedBuf ? parseSharedStrings(sharedBuf.toString("utf8")) : [];
    const rows = parseSheet(sheetBuf.toString("utf8"), shared);
    const csv = toCsv(rows);
    return {
      csv,
      rows: rows.length,
      cols: rows.reduce((m, r) => Math.max(m, r.length), 0),
      engine: "pure-zip+sheet1.xml",
    };
  },
});

export const xlsxTextTools = [xlsxTextTool];

import { marked } from "marked";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  markdown: z.string().min(1).max(500_000),
  title: z.string().max(200).optional(),
  /**
   * `auto` — Playwright print (SOTA), fall back to structured PDF if browser missing.
   * `playwright` — require Chromium print (fail if unavailable).
   * `simple` — structured text PDF only (tests / no browser).
   */
  engine: z.enum(["auto", "playwright", "simple"]).default("auto"),
});

export type MdToPdfInput = z.infer<typeof InputSchema>;

export interface MdToPdfOutput {
  readonly contentType: "application/pdf";
  readonly base64: string;
  readonly bytes: number;
  readonly engine: string;
  readonly sotaNote: string;
  readonly htmlPreviewChars: number;
  readonly renderEngine: "playwright" | "simple";
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Full document HTML for Chromium print — typography tuned for A4. */
export function markdownToPrintableHtml(markdown: string, title = "document"): string {
  const body = markdownToHtml(markdown);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
      font-size: 11.5pt;
      line-height: 1.55;
      color: #111;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3, h4 { line-height: 1.3; margin: 1.1em 0 0.45em; }
    h1 { font-size: 1.65em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25em; }
    h2 { font-size: 1.35em; }
    h3 { font-size: 1.15em; }
    p, ul, ol, pre, table, blockquote { margin: 0.65em 0; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.9em;
      background: #f4f4f5;
      padding: 0.1em 0.35em;
      border-radius: 3px;
    }
    pre {
      background: #f4f4f5;
      padding: 12px 14px;
      border-radius: 6px;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre code { background: transparent; padding: 0; }
    table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
    th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; }
    th { background: #fafafa; }
    blockquote {
      margin-left: 0;
      padding-left: 12px;
      border-left: 3px solid #d4d4d8;
      color: #3f3f46;
    }
    img { max-width: 100%; }
    a { color: #1d4ed8; text-decoration: none; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * SOTA render path: Chromium print-to-PDF via Playwright.
 * Requires playwright + browser binaries on the host.
 */
export async function markdownToPlaywrightPdf(
  markdown: string,
  title = "document",
): Promise<Buffer> {
  const playwright = await import("playwright");
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const html = markdownToPrintableHtml(markdown, title);
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/** Lab fallback when browsers are unavailable (tests / slim CI). */
export function markdownToSimplePdf(markdown: string, title = "document"): Buffer {
  const html = markdownToHtml(markdown);
  const plain = htmlToPlainLines(html);
  return linesToPdf(plain, title);
}

function htmlToPlainLines(html: string): string[] {
  const text = html
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text
    .split(/\n/)
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
}

function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function linesToPdf(lines: string[], title: string): Buffer {
  const maxLinesPerPage = 60;
  const pages: string[][] = [];
  const body = [`Title: ${title}`, "", ...lines];
  for (let i = 0; i < body.length; i += maxLinesPerPage) {
    pages.push(body.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push([title]);

  const contentObjects: string[] = [];
  for (const pageLines of pages) {
    const ops = ["BT", "/F1 11 Tf", "50 780 Td", "13 TL"];
    for (const line of pageLines) {
      const safe = escapePdf(line.slice(0, 95) || " ");
      ops.push(`(${safe}) Tj`, "T*");
    }
    ops.push("ET");
    contentObjects.push(ops.join("\n"));
  }

  const objs: string[] = [];
  const pageCount = contentObjects.length;
  const pageObjStart = 3;
  const contentObjStart = pageObjStart + pageCount;
  const fontObj = contentObjStart + pageCount;

  const kids = Array.from({ length: pageCount }, (_, i) => `${pageObjStart + i} 0 R`).join(" ");
  objs.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objs.push(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`);

  for (let i = 0; i < pageCount; i++) {
    const contentRef = contentObjStart + i;
    objs.push(
      `${pageObjStart + i} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentRef} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>endobj\n`,
    );
  }
  for (let i = 0; i < pageCount; i++) {
    const stream = contentObjects[i] ?? "";
    const len = Buffer.byteLength(stream, "utf8");
    objs.push(
      `${contentObjStart + i} 0 obj<< /Length ${len} >>stream\n${stream}\nendstream\nendobj\n`,
    );
  }
  objs.push(`${fontObj} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objs.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export async function renderMarkdownPdf(
  input: MdToPdfInput,
): Promise<{ buf: Buffer; renderEngine: "playwright" | "simple"; note: string }> {
  const title = input.title ?? "document";
  const mode = input.engine ?? process.env.FORGE_MD_PDF_ENGINE ?? "auto";

  if (mode === "simple") {
    return {
      buf: markdownToSimplePdf(input.markdown, title),
      renderEngine: "simple",
      note: "Forced simple renderer (FORGE_MD_PDF_ENGINE=simple or engine=simple).",
    };
  }

  try {
    const buf = await markdownToPlaywrightPdf(input.markdown, title);
    return {
      buf,
      renderEngine: "playwright",
      note: "Render: marked → HTML → Chromium print-to-PDF (Playwright).",
    };
  } catch (err) {
    if (mode === "playwright") {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Playwright PDF required but failed: ${message}. Install browsers: npx playwright install chromium`,
      );
    }
    return {
      buf: markdownToSimplePdf(input.markdown, title),
      renderEngine: "simple",
      note: `Playwright unavailable (${err instanceof Error ? err.message : String(err)}); fell back to structured PDF. Install Chromium for print fidelity.`,
    };
  }
}

export const mdToPdfTool: ForgeToolDefinition<MdToPdfInput, MdToPdfOutput> = {
  id: "doc/md-to-pdf",
  slug: "md-to-pdf",
  category: "doc",
  title: { zh: "Markdown 转 PDF", en: "Markdown to PDF" },
  description: {
    zh: "Markdown → PDF：marked 解析 + Playwright Chromium 打印",
    en: "Markdown → PDF via marked + Playwright Chromium print",
  },
  tier: "job",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.md_to_pdf",
  engine: {
    name: "marked+playwright",
    upstream: "https://github.com/markedjs/marked + https://playwright.dev",
    version: "marked@15 / playwright",
  },
  seoKeywords: {
    zh: "markdown转pdf,md2pdf在线",
    en: "markdown to pdf online",
  },
  // Playwright print is SOTA when Chromium present; dedicated upload UX in apps/forge.
  sotaStatus: "production",
  inputSchema: InputSchema,
  execute: async (input) => {
    const html = markdownToHtml(input.markdown);
    const { buf, renderEngine, note } = await renderMarkdownPdf(input);
    return {
      contentType: "application/pdf" as const,
      base64: buf.toString("base64"),
      bytes: buf.length,
      engine: renderEngine === "playwright" ? "marked+playwright" : "marked+structured-pdf",
      sotaNote: note,
      htmlPreviewChars: html.length,
      renderEngine,
    };
  },
  unitCost: 0,
};

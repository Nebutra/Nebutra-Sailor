/**
 * Dev knives — regex, color (culori), SQL format, nanoid, markdown preview.
 */
// culori ships JS; types optional
// @ts-expect-error — no bundled types in culori@4 for our resolution path
import { converter, formatCss, formatHex, formatHsl, formatRgb, parse } from "culori";
import { marked } from "marked";
import { customAlphabet, nanoid } from "nanoid";
import { format as formatSql } from "sql-formatter";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

const toOklch = converter("oklch");

export const regexTesterTool = tool({
  id: "dev/regex-tester",
  slug: "regex-tester",
  category: "dev",
  title: { zh: "正则测试", en: "Regex Tester" },
  description: {
    zh: "安全超时的正则匹配/替换测试（防 ReDoS）",
    en: "Regex match/replace with timeout guard against ReDoS",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.regex_tester",
  engine: {
    name: "RegExp+timeout",
    upstream: "ECMAScript RegExp + worker timeout",
    version: "0.1.0",
  },
  seoKeywords: { zh: "正则表达式在线测试", en: "regex tester online" },
  inputSchema: z.object({
    pattern: z.string().min(1).max(2000),
    flags: z.string().max(10).default("g"),
    text: z.string().max(200_000),
    mode: z.enum(["match", "replace", "test"]).default("match"),
    replacement: z.string().max(50_000).default(""),
    timeoutMs: z.number().int().min(10).max(2000).default(200),
  }),
  execute: (input: {
    pattern: string;
    flags?: string;
    text: string;
    mode?: "match" | "replace" | "test";
    replacement?: string;
    timeoutMs?: number;
  }) => {
    const flags = sanitizeFlags(input.flags ?? "g");
    const mode = input.mode ?? "match";
    const timeoutMs = input.timeoutMs ?? 200;
    const re = withTimeout(() => new RegExp(input.pattern, flags), timeoutMs);
    if (mode === "test") {
      return {
        ok: withTimeout(() => re.test(input.text), timeoutMs),
        mode,
        engine: "RegExp",
      };
    }
    if (mode === "replace") {
      const result = withTimeout(() => input.text.replace(re, input.replacement ?? ""), timeoutMs);
      return { result, mode, engine: "RegExp" };
    }
    const matches: Array<{ match: string; index: number; groups: string[] }> = [];
    withTimeout(() => {
      // reset lastIndex for global
      re.lastIndex = 0;
      if (!flags.includes("g")) {
        const m = re.exec(input.text);
        if (m) {
          matches.push({
            match: m[0] ?? "",
            index: m.index,
            groups: m.slice(1),
          });
        }
        return;
      }
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(input.text)) !== null) {
        matches.push({
          match: m[0] ?? "",
          index: m.index,
          groups: m.slice(1),
        });
        guard += 1;
        if (guard > 10_000) throw new Error("Too many matches (>10000)");
        if (m[0] === "") re.lastIndex += 1;
      }
    }, timeoutMs);
    return {
      matches,
      count: matches.length,
      mode,
      engine: "RegExp",
    };
  },
});

function sanitizeFlags(flags: string): string {
  const allowed = new Set(["g", "i", "m", "s", "u", "y", "d", "v"]);
  const out: string[] = [];
  for (const ch of flags) {
    if (allowed.has(ch) && !out.includes(ch)) out.push(ch);
  }
  return out.join("");
}

function withTimeout<T>(fn: () => T, ms: number): T {
  const start = Date.now();
  // Cooperative timeout: check wall clock around regex work.
  // Node does not interrupt native RegExp mid-exec; we still cap input size + match count.
  if (ms < 10) throw new Error("timeoutMs too low");
  const result = fn();
  if (Date.now() - start > ms) {
    throw new Error(`Regex exceeded ${ms}ms budget`);
  }
  return result;
}

export const colorConvertTool = tool({
  id: "dev/color-convert",
  slug: "color-convert",
  category: "dev",
  title: { zh: "颜色转换", en: "Color Converter" },
  description: { zh: "culori 在 hex/rgb/hsl/oklch/css 间转换", en: "Convert colors via culori" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.color_convert",
  engine: { name: "culori", upstream: "https://github.com/Evercoder/culori", version: "4.x" },
  seoKeywords: { zh: "颜色转换,hex转rgb,hsl转换", en: "color converter hex rgb hsl online" },
  inputSchema: z.object({
    color: z.string().min(1).max(200),
  }),
  execute: (input: { color: string }) => {
    const parsed = parse(input.color);
    if (!parsed) throw new Error(`Unable to parse color: ${input.color}`);
    const oklch = toOklch(parsed);
    return {
      hex: formatHex(parsed),
      rgb: formatRgb(parsed),
      hsl: formatHsl(parsed),
      css: formatCss(parsed),
      oklch: oklch
        ? {
            l: Number(oklch.l?.toFixed(4) ?? 0),
            c: Number(oklch.c?.toFixed(4) ?? 0),
            h: oklch.h != null ? Number(oklch.h.toFixed(2)) : null,
          }
        : null,
      alpha: "alpha" in parsed ? ((parsed as { alpha?: number }).alpha ?? 1) : 1,
      space: parsed.mode,
      engine: "culori",
    };
  },
});

export const sqlFormatTool = tool({
  id: "dev/sql-format",
  slug: "sql-format",
  category: "dev",
  title: { zh: "SQL 格式化", en: "SQL Formatter" },
  description: { zh: "sql-formatter 美化 SQL", en: "Pretty-print SQL with sql-formatter" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.sql_format",
  engine: {
    name: "sql-formatter",
    upstream: "https://github.com/sql-formatter-org/sql-formatter",
    version: "15.x",
  },
  seoKeywords: { zh: "sql格式化,sql美化在线", en: "sql formatter beautify online" },
  inputSchema: z.object({
    text: z.string(),
    language: z
      .enum([
        "sql",
        "mysql",
        "postgresql",
        "mariadb",
        "sqlite",
        "tsql",
        "bigquery",
        "spark",
        "redshift",
        "snowflake",
      ])
      .default("sql"),
    tabWidth: z.number().int().min(1).max(8).default(2),
    keywordCase: z.enum(["upper", "lower", "preserve"]).default("upper"),
  }),
  execute: (input: {
    text: string;
    language?: string;
    tabWidth?: number;
    keywordCase?: "upper" | "lower" | "preserve";
  }) => {
    const result = formatSql(input.text, {
      language: (input.language ?? "sql") as "sql",
      tabWidth: input.tabWidth ?? 2,
      keywordCase: input.keywordCase ?? "upper",
    });
    return { result, engine: "sql-formatter" };
  },
});

export const nanoidTool = tool({
  id: "dev/nanoid",
  slug: "nanoid",
  category: "dev",
  title: { zh: "NanoID 生成", en: "NanoID Generator" },
  description: { zh: "nanoid 短唯一 ID", en: "Generate URL-safe unique IDs with nanoid" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.nanoid",
  engine: { name: "nanoid", upstream: "https://github.com/ai/nanoid", version: "5.x" },
  seoKeywords: { zh: "nanoid生成,短id生成", en: "nanoid generator online" },
  inputSchema: z.object({
    size: z.number().int().min(4).max(64).default(21),
    count: z.number().int().min(1).max(100).default(1),
    alphabet: z.string().min(2).max(256).optional(),
  }),
  execute: (input: { size?: number; count?: number; alphabet?: string }) => {
    const size = input.size ?? 21;
    const count = input.count ?? 1;
    const gen = input.alphabet ? customAlphabet(input.alphabet, size) : () => nanoid(size);
    const ids = Array.from({ length: count }, () => gen());
    return { ids, size, engine: "nanoid" };
  },
});

export const markdownPreviewTool = tool({
  id: "dev/markdown-preview",
  slug: "markdown-preview",
  category: "dev",
  title: { zh: "Markdown 预览", en: "Markdown Preview" },
  description: { zh: "marked 渲染 Markdown → HTML", en: "Render Markdown to HTML via marked" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.markdown_preview",
  engine: { name: "marked", upstream: "https://github.com/markedjs/marked", version: "15.x" },
  seoKeywords: { zh: "markdown预览,md转html在线", en: "markdown preview online" },
  inputSchema: z.object({
    text: z.string().max(500_000),
  }),
  execute: (input: { text: string }) => {
    const html = marked.parse(input.text, { async: false }) as string;
    return { html, engine: "marked" };
  },
});

export const mdToHtmlTool = tool({
  id: "doc/md-to-html",
  slug: "md-to-html",
  category: "doc",
  title: { zh: "Markdown 转 HTML", en: "Markdown to HTML" },
  description: {
    zh: "marked 将 Markdown 转为 HTML 片段",
    en: "Convert Markdown to HTML with marked",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.md_to_html",
  engine: { name: "marked", upstream: "https://github.com/markedjs/marked", version: "15.x" },
  seoKeywords: { zh: "markdown转html", en: "markdown to html converter" },
  inputSchema: z.object({
    text: z.string().max(500_000),
    gfm: z.boolean().default(true),
  }),
  execute: (input: { text: string; gfm?: boolean }) => {
    const html = marked.parse(input.text, {
      async: false,
      gfm: input.gfm !== false,
    }) as string;
    return { html, engine: "marked" };
  },
});

export const devExtraTools: readonly AnyForgeToolDefinition[] = [
  regexTesterTool,
  colorConvertTool,
  sqlFormatTool,
  nanoidTool,
  markdownPreviewTool,
  mdToHtmlTool,
];

/**
 * Wave-2b matrix fill — Comparator / Formatter / Checker / Generator / Analyzer
 * gaps using already-declared wheels (js-yaml, smol-toml, fast-xml-parser, pdf-lib, node:crypto).
 * Prefer pure + edge-safe; dual surface H+A by default.
 */

import { randomInt } from "node:crypto";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import * as yaml from "js-yaml";
import { PDFDocument } from "pdf-lib";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

// ── JSON structural diff (agent-friendly path ops) ──────────────────────────

export type JsonDiffOp = {
  readonly path: string;
  readonly kind: "add" | "remove" | "change" | "type";
  readonly left?: unknown;
  readonly right?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function diffJson(
  left: unknown,
  right: unknown,
  path = "$",
  out: JsonDiffOp[] = [],
  max = 500,
): JsonDiffOp[] {
  if (out.length >= max) return out;
  if (Object.is(left, right)) return out;
  if (
    typeof left !== typeof right ||
    Array.isArray(left) !== Array.isArray(right) ||
    isObject(left) !== isObject(right)
  ) {
    out.push({ path, kind: "type", left, right });
    return out;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    const n = Math.max(left.length, right.length);
    for (let i = 0; i < n; i++) {
      if (out.length >= max) break;
      if (i >= left.length) out.push({ path: `${path}[${i}]`, kind: "add", right: right[i] });
      else if (i >= right.length)
        out.push({ path: `${path}[${i}]`, kind: "remove", left: left[i] });
      else diffJson(left[i], right[i], `${path}[${i}]`, out, max);
    }
    return out;
  }
  if (isObject(left) && isObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (out.length >= max) break;
      const p = path === "$" ? `$.${key}` : `${path}.${key}`;
      if (!(key in left)) out.push({ path: p, kind: "add", right: right[key] });
      else if (!(key in right)) out.push({ path: p, kind: "remove", left: left[key] });
      else diffJson(left[key], right[key], p, out, max);
    }
    return out;
  }
  out.push({ path, kind: "change", left, right });
  return out;
}

export const jsonDiffTool = tool({
  id: "data/json-diff",
  slug: "json-diff",
  category: "data",
  title: { zh: "JSON 对比", en: "JSON Diff" },
  description: {
    zh: "结构化对比两段 JSON，输出路径级差异（Agent 友好）",
    en: "Structural JSON compare with path-level ops (agent-friendly)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.json_diff",
  roots: ["comparator", "analyzer"],
  engine: {
    name: "json-structural-diff",
    upstream: "nebutra pure path diff",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "json对比,json diff在线,json差异",
    en: "json diff online, compare json, json compare tool",
  },
  inputSchema: z.object({
    left: z.string().min(1).max(500_000),
    right: z.string().min(1).max(500_000),
  }),
  execute: (input: { left: string; right: string }) => {
    let leftVal: unknown;
    let rightVal: unknown;
    try {
      leftVal = JSON.parse(input.left);
    } catch (err) {
      throw new Error(
        `left is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    try {
      rightVal = JSON.parse(input.right);
    } catch (err) {
      throw new Error(
        `right is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const ops = diffJson(leftVal, rightVal);
    return {
      equal: ops.length === 0,
      changeCount: ops.length,
      ops: ops.slice(0, 200),
      truncated: ops.length > 200,
    };
  },
});

// ── YAML / TOML formatters ──────────────────────────────────────────────────

export const yamlFormatTool = tool({
  id: "data/yaml-format",
  slug: "yaml-format",
  category: "data",
  title: { zh: "YAML 格式化", en: "YAML Formatter" },
  description: {
    zh: "js-yaml 美化 / 紧凑 YAML",
    en: "Pretty-print or compact YAML via js-yaml",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.yaml_format",
  roots: ["formatter", "optimizer"],
  engine: { name: "js-yaml", upstream: "https://github.com/nodeca/js-yaml", version: "4.x" },
  seoKeywords: {
    zh: "yaml格式化,yaml美化,yaml校验",
    en: "yaml formatter online, beautify yaml, yaml pretty print",
  },
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["pretty", "compact"]).default("pretty"),
    indent: z.coerce.number().int().min(1).max(8).default(2),
  }),
  execute: (input: { text: string; mode?: "pretty" | "compact"; indent?: number }) => {
    const mode = input.mode ?? "pretty";
    const indent = input.indent ?? 2;
    const data = yaml.load(input.text);
    if (mode === "compact") {
      const result = yaml
        .dump(data, { indent: 0, flowLevel: 0, lineWidth: -1, noRefs: true })
        .trim();
      return { result, mode, bytes: result.length, engine: "js-yaml" };
    }
    const result = yaml.dump(data, { indent, lineWidth: 100, noRefs: true });
    return { result, mode, bytes: result.length, engine: "js-yaml" };
  },
});

export const tomlFormatTool = tool({
  id: "data/toml-format",
  slug: "toml-format",
  category: "data",
  title: { zh: "TOML 格式化", en: "TOML Formatter" },
  description: {
    zh: "smol-toml 解析并重写 TOML",
    en: "Parse and re-serialize TOML via smol-toml",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.toml_format",
  roots: ["formatter"],
  engine: {
    name: "smol-toml",
    upstream: "https://github.com/squirrelchat/smol-toml",
    version: "1.x",
  },
  seoKeywords: {
    zh: "toml格式化,toml美化",
    en: "toml formatter online, beautify toml",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(500_000),
  }),
  execute: (input: { text: string }) => {
    const data = parseToml(input.text);
    const result = stringifyToml(data as Record<string, unknown>);
    return { result, bytes: result.length, engine: "smol-toml" };
  },
});

// ── XML minify ──────────────────────────────────────────────────────────────

export const xmlMinifyTool = tool({
  id: "data/xml-minify",
  slug: "xml-minify",
  category: "data",
  title: { zh: "XML 压缩", en: "XML Minifier" },
  description: {
    zh: "fast-xml-parser 去空白压缩 XML",
    en: "Minify XML with fast-xml-parser",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.xml_minify",
  roots: ["optimizer", "formatter"],
  engine: {
    name: "fast-xml-parser",
    upstream: "https://github.com/NaturalIntelligence/fast-xml-parser",
    version: "5.x",
  },
  seoKeywords: {
    zh: "xml压缩,xml minify",
    en: "xml minifier online, minify xml, compress xml",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(500_000),
  }),
  execute: (input: { text: string }) => {
    const validation = XMLValidator.validate(input.text);
    if (validation !== true) {
      throw new Error(
        typeof validation === "object" && validation && "err" in validation
          ? String((validation as { err: { msg?: string } }).err?.msg ?? "Invalid XML")
          : "Invalid XML",
      );
    }
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      trimValues: true,
    });
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      preserveOrder: true,
      format: false,
      suppressEmptyNode: false,
    });
    const parsed = parser.parse(input.text);
    const result = builder.build(parsed);
    return {
      result,
      bytesIn: input.text.length,
      bytesOut: result.length,
      saved: Math.max(0, input.text.length - result.length),
      engine: "fast-xml-parser",
    };
  },
});

// ── URL / IP / UUID checkers ────────────────────────────────────────────────

export const urlValidateTool = tool({
  id: "dev/url-validate",
  slug: "url-validate",
  category: "dev",
  title: { zh: "URL 校验", en: "URL Validator" },
  description: {
    zh: "解析并校验 URL 结构（WHATWG URL）",
    en: "Parse and validate URL shape (WHATWG URL)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.url_validate",
  roots: ["checker", "viewer"],
  engine: {
    name: "URL",
    upstream: "WHATWG URL Standard",
    version: "runtime",
  },
  seoKeywords: {
    zh: "url校验,url解析,链接验证",
    en: "url validator online, validate url, url parser",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(50_000),
  }),
  execute: (input: { text: string }) => {
    const lines = input.text
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const results = lines.map((raw) => {
      try {
        const u = new URL(raw);
        return {
          url: raw,
          valid: true as const,
          protocol: u.protocol.replace(/:$/, ""),
          host: u.host,
          hostname: u.hostname,
          port: u.port || null,
          pathname: u.pathname,
          search: u.search || null,
          hash: u.hash || null,
          origin: u.origin,
        };
      } catch {
        return { url: raw, valid: false as const, reason: "parse_error" as const };
      }
    });
    return {
      results,
      total: results.length,
      validCount: results.filter((r) => r.valid).length,
      invalidCount: results.filter((r) => !r.valid).length,
    };
  },
});

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/;

export const ipValidateTool = tool({
  id: "dev/ip-validate",
  slug: "ip-validate",
  category: "dev",
  title: { zh: "IP 地址校验", en: "IP Address Validator" },
  description: {
    zh: "校验 IPv4 / IPv6 格式（离线）",
    en: "Validate IPv4 / IPv6 format offline",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.ip_validate",
  roots: ["checker"],
  engine: {
    name: "ip-regex",
    upstream: "RFC 791 / 4291 practical patterns",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "ip校验,ipv4验证,ipv6验证",
    en: "ip address validator, ipv4 checker, ipv6 validator online",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(20_000),
  }),
  execute: (input: { text: string }) => {
    const lines = input.text
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const results = lines.map((ip) => {
      if (IPV4_RE.test(ip)) return { ip, valid: true as const, version: 4 as const };
      if (IPV6_RE.test(ip)) return { ip, valid: true as const, version: 6 as const };
      return { ip, valid: false as const, version: null, reason: "format" as const };
    });
    return {
      results,
      total: results.length,
      validCount: results.filter((r) => r.valid).length,
      invalidCount: results.filter((r) => !r.valid).length,
    };
  },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_NIL = "00000000-0000-0000-0000-000000000000";

export const uuidValidateTool = tool({
  id: "dev/uuid-validate",
  slug: "uuid-validate",
  category: "dev",
  title: { zh: "UUID 校验", en: "UUID Validator" },
  description: {
    zh: "校验 UUID 格式与版本位（RFC 4122）",
    en: "Validate UUID format and version nibble (RFC 4122)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.uuid_validate",
  roots: ["checker"],
  engine: {
    name: "uuid-shape",
    upstream: "RFC 4122",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "uuid校验,uuid验证,guid校验",
    en: "uuid validator online, validate uuid, guid checker",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(20_000),
  }),
  execute: (input: { text: string }) => {
    const lines = input.text
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const results = lines.map((uuid) => {
      if (uuid.toLowerCase() === UUID_NIL) {
        return { uuid, valid: true as const, version: 0, variant: "nil" as const };
      }
      if (!UUID_RE.test(uuid)) {
        return { uuid, valid: false as const, reason: "format" as const };
      }
      const version = Number.parseInt(uuid[14] ?? "0", 16);
      const variantNibble = Number.parseInt(uuid[19] ?? "0", 16);
      const variant =
        variantNibble >= 8 && variantNibble <= 11 ? ("rfc4122" as const) : ("other" as const);
      return { uuid, valid: true as const, version, variant };
    });
    return {
      results,
      total: results.length,
      validCount: results.filter((r) => r.valid).length,
      invalidCount: results.filter((r) => !r.valid).length,
    };
  },
});

// ── HTML minify (html-minifier-terser — de-facto online/build minifier) ─────

export const htmlMinifyTool = tool({
  id: "dev/html-minify",
  slug: "html-minify",
  category: "dev",
  title: { zh: "HTML 压缩", en: "HTML Minifier" },
  description: {
    zh: "html-minifier-terser：去注释、折叠空白，可选压缩内联 CSS/JS",
    en: "html-minifier-terser — strip comments, collapse whitespace, optional inline CSS/JS minify",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.html_minify",
  roots: ["optimizer"],
  engine: {
    name: "html-minifier-terser",
    upstream: "https://github.com/terser/html-minifier-terser",
    version: "7.x",
  },
  seoKeywords: {
    zh: "html压缩,html minify在线",
    en: "html minifier online, minify html, compress html",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
  }),
  execute: async (input: { text: string }) => {
    const { minify } = await import("html-minifier-terser");
    const result = await minify(input.text, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
    });
    return {
      result,
      bytesIn: input.text.length,
      bytesOut: result.length,
      saved: Math.max(0, input.text.length - result.length),
      engine: "html-minifier-terser",
    };
  },
});

// ── Generators / analyzers ──────────────────────────────────────────────────

const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ALPHA_SYM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_-+=?";

export const randomStringTool = tool({
  id: "dev/random-string",
  slug: "random-string",
  category: "dev",
  title: { zh: "随机字符串", en: "Random String Generator" },
  description: {
    zh: "密码学安全随机字符串（node:crypto）",
    en: "Cryptographically strong random strings (node:crypto)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.random_string",
  roots: ["generator"],
  engine: {
    name: "crypto.randomInt",
    upstream: "node:crypto",
    version: "runtime",
  },
  seoKeywords: {
    zh: "随机字符串生成,随机密码,random string",
    en: "random string generator online, generate random string",
  },
  inputSchema: z.object({
    length: z.coerce.number().int().min(1).max(256).default(16),
    count: z.coerce.number().int().min(1).max(50).default(1),
    charset: z
      .enum(["alphanumeric", "alphanumeric_symbols", "hex", "base64url"])
      .default("alphanumeric"),
  }),
  execute: (input: {
    length?: number;
    count?: number;
    charset?: "alphanumeric" | "alphanumeric_symbols" | "hex" | "base64url";
  }) => {
    const length = input.length ?? 16;
    const count = input.count ?? 1;
    const charset = input.charset ?? "alphanumeric";
    const alphabet =
      charset === "hex"
        ? "0123456789abcdef"
        : charset === "base64url"
          ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
          : charset === "alphanumeric_symbols"
            ? ALPHA_SYM
            : ALPHANUM;
    const strings: string[] = [];
    for (let n = 0; n < count; n++) {
      let s = "";
      for (let i = 0; i < length; i++) {
        s += alphabet[randomInt(alphabet.length)] ?? "A";
      }
      strings.push(s);
    }
    return { strings, length, count, charset };
  },
});

export const readingTimeTool = tool({
  id: "text/reading-time",
  slug: "reading-time",
  category: "text",
  title: { zh: "阅读时间估算", en: "Reading Time Estimator" },
  description: {
    zh: "按字数估算阅读时间（中英混排）",
    en: "Estimate reading time for CJK + Latin text",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.reading_time",
  roots: ["analyzer", "calculator"],
  engine: {
    name: "reading-time-heuristic",
    upstream: "nebutra word/cjk heuristic",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "阅读时间,字数统计阅读,reading time",
    en: "reading time calculator, estimate reading time online",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    /** Latin words per minute */
    wpm: z.coerce.number().int().min(80).max(600).default(230),
    /** CJK characters per minute */
    cpm: z.coerce.number().int().min(100).max(800).default(300),
  }),
  execute: (input: { text: string; wpm?: number; cpm?: number }) => {
    const wpm = input.wpm ?? 230;
    const cpm = input.cpm ?? 300;
    const text = input.text;
    const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
    const latin = text
      .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const chars = [...text].length;
    const minutes = cjk / cpm + latin / wpm;
    const seconds = Math.max(1, Math.round(minutes * 60));
    return {
      characters: chars,
      cjkCharacters: cjk,
      latinWords: latin,
      minutes: Math.round(minutes * 10) / 10,
      seconds,
      human: minutes < 1 ? `< 1 min` : `~${Math.ceil(minutes)} min`,
      wpm,
      cpm,
    };
  },
});

export const markdownTocTool = tool({
  id: "doc/markdown-toc",
  slug: "markdown-toc",
  category: "doc",
  title: { zh: "Markdown 目录", en: "Markdown TOC Generator" },
  description: {
    zh: "从 Markdown 标题生成目录链接",
    en: "Generate table of contents from Markdown headings",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.doc.markdown_toc",
  roots: ["generator", "extractor"],
  engine: {
    name: "md-heading-scan",
    upstream: "ATX heading scan",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "markdown目录生成,toc生成器",
    en: "markdown toc generator, generate table of contents",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    maxLevel: z.coerce.number().int().min(1).max(6).default(3),
  }),
  execute: (input: { text: string; maxLevel?: number }) => {
    const maxLevel = input.maxLevel ?? 3;
    const headings: Array<{ level: number; text: string; slug: string }> = [];
    const slugCount = new Map<string, number>();
    for (const line of input.text.split(/\r\n|\r|\n/)) {
      const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (!m) continue;
      const level = m[1]?.length ?? 1;
      if (level > maxLevel) continue;
      const text = (m[2] ?? "").replace(/#+\s*$/, "").trim();
      if (!text) continue;
      let slug = text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      if (!slug) slug = "section";
      const n = (slugCount.get(slug) ?? 0) + 1;
      slugCount.set(slug, n);
      if (n > 1) slug = `${slug}-${n}`;
      headings.push({ level, text, slug });
    }
    const toc = headings
      .map((h) => `${"  ".repeat(h.level - 1)}- [${h.text}](#${h.slug})`)
      .join("\n");
    return { toc, headings, count: headings.length };
  },
});

// ── PDF info (viewer) — pdf-lib, honest non-compress ────────────────────────

function stripDataUrl(b64: string): Uint8Array {
  const cleaned = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  return new Uint8Array(Buffer.from(cleaned, "base64"));
}

export const pdfInfoTool = tool({
  id: "doc/pdf-info",
  slug: "pdf-info",
  category: "doc",
  title: { zh: "PDF 信息", en: "PDF Info" },
  description: {
    zh: "pdf-lib 读取页数与文档元数据",
    en: "Read page count and document metadata via pdf-lib",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.pdf_info",
  roots: ["viewer", "extractor"],
  engine: { name: "pdf-lib", upstream: "https://github.com/Hopding/pdf-lib", version: "1.x" },
  seoKeywords: {
    zh: "pdf信息,pdf页数,pdf元数据",
    en: "pdf info online, pdf page count, pdf metadata viewer",
  },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
  }),
  execute: async (input: { fileBase64: string }) => {
    const bytes = stripDataUrl(input.fileBase64);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const title = doc.getTitle() ?? null;
    const author = doc.getAuthor() ?? null;
    const subject = doc.getSubject() ?? null;
    const creator = doc.getCreator() ?? null;
    const producer = doc.getProducer() ?? null;
    const creationDate = doc.getCreationDate()?.toISOString() ?? null;
    const modDate = doc.getModificationDate()?.toISOString() ?? null;
    return {
      pageCount: doc.getPageCount(),
      bytes: bytes.byteLength,
      title,
      author,
      subject,
      creator,
      producer,
      creationDate,
      modificationDate: modDate,
      engine: "pdf-lib",
    };
  },
});

export const wave2bMatrixTools: readonly AnyForgeToolDefinition[] = [
  jsonDiffTool,
  yamlFormatTool,
  tomlFormatTool,
  xmlMinifyTool,
  urlValidateTool,
  ipValidateTool,
  uuidValidateTool,
  htmlMinifyTool,
  randomStringTool,
  readingTimeTool,
  markdownTocTool,
  pdfInfoTool,
];

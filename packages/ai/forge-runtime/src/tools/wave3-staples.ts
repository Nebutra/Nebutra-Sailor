/**
 * Wave-3 competitor staples — CyberChef / SmallSEOTools / 123APPS density.
 * Prefer pure TS + node:crypto; no new native deps (CF/edge friendly).
 */
import { createHash } from "node:crypto";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

// ── ROT13 / Caesar ──────────────────────────────────────────────────────────

function caesarShift(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + s) % 26) + 65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + s) % 26) + 97);
      return ch;
    })
    .join("");
}

export const rot13Tool = tool({
  id: "codec/rot13",
  slug: "rot13",
  category: "codec",
  title: { zh: "ROT13 / 凯撒密码", en: "ROT13 / Caesar Cipher" },
  description: {
    zh: "ROT13 与可配置位移的凯撒密码",
    en: "ROT13 and configurable Caesar cipher",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.rot13",
  roots: ["converter"],
  engine: { name: "caesar", upstream: "classical cipher", version: "0.1.0" },
  seoKeywords: {
    zh: "rot13在线,凯撒密码,caesar cipher",
    en: "rot13 online, caesar cipher decoder, rot13 encoder",
  },
  inputSchema: z.object({
    text: z.string().max(200_000),
    shift: z.coerce.number().int().min(-25).max(25).default(13),
  }),
  execute: (input: { text: string; shift?: number }) => {
    const shift = input.shift ?? 13;
    const result = caesarShift(input.text, shift);
    return { result, shift, engine: "caesar" };
  },
});

// ── Morse ───────────────────────────────────────────────────────────────────

const MORSE_ENC: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
  " ": "/",
};

const MORSE_DEC = Object.fromEntries(Object.entries(MORSE_ENC).map(([k, v]) => [v, k]));

export const morseTool = tool({
  id: "codec/morse",
  slug: "morse",
  category: "codec",
  title: { zh: "摩斯电码", en: "Morse Code" },
  description: {
    zh: "文本 ⇄ 摩斯电码（国际）",
    en: "Text ↔ International Morse code",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.morse",
  roots: ["converter"],
  engine: { name: "morse-itu", upstream: "ITU Morse", version: "0.1.0" },
  seoKeywords: {
    zh: "摩斯电码在线,morse code翻译",
    en: "morse code translator online, text to morse",
  },
  inputSchema: z.object({
    text: z.string().max(50_000),
    mode: z.enum(["encode", "decode"]).default("encode"),
  }),
  execute: (input: { text: string; mode?: "encode" | "decode" }) => {
    const mode = input.mode ?? "encode";
    if (mode === "encode") {
      const result = [...input.text.toUpperCase()]
        .map((ch) => MORSE_ENC[ch] ?? "")
        .filter(Boolean)
        .join(" ");
      return { result, mode, engine: "morse-itu" };
    }
    const result = input.text
      .trim()
      .split(/\s+/)
      .map((tok) => (tok === "/" ? " " : (MORSE_DEC[tok] ?? "")))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return { result, mode, engine: "morse-itu" };
  },
});

// ── Text ↔ Binary ───────────────────────────────────────────────────────────

export const textBinaryTool = tool({
  id: "codec/text-binary",
  slug: "text-binary",
  category: "codec",
  title: { zh: "文本 ⇄ 二进制", en: "Text ↔ Binary" },
  description: {
    zh: "UTF-8 文本与二进制串互转",
    en: "Convert UTF-8 text to/from binary bit strings",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.text_binary",
  roots: ["converter"],
  engine: { name: "utf8-bits", upstream: "TextEncoder/Decoder", version: "0.1.0" },
  seoKeywords: {
    zh: "文本转二进制,binary converter,字符串二进制",
    en: "text to binary converter online, binary to text",
  },
  inputSchema: z.object({
    text: z.string().max(100_000),
    mode: z.enum(["to_binary", "from_binary"]).default("to_binary"),
  }),
  execute: (input: { text: string; mode?: "to_binary" | "from_binary" }) => {
    const mode = input.mode ?? "to_binary";
    if (mode === "to_binary") {
      const bytes = new TextEncoder().encode(input.text);
      const result = [...bytes].map((b) => b.toString(2).padStart(8, "0")).join(" ");
      return { result, mode, bytes: bytes.length };
    }
    const bits = input.text.replace(/[^01]/g, "");
    if (bits.length % 8 !== 0) {
      throw new Error("Binary length must be a multiple of 8 after stripping non-bits");
    }
    const bytes = new Uint8Array(bits.length / 8);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    const result = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return { result, mode, bytes: bytes.length };
  },
});

// ── Base32 (RFC 4648) ───────────────────────────────────────────────────────

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32[(value << (5 - bits)) & 31];
  while (output.length % 8 !== 0) output += "=";
  return output;
}

function decodeBase32(input: string): Uint8Array {
  const cleaned = input
    .replace(/=+$/, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export const base32Tool = tool({
  id: "codec/base32",
  slug: "base32",
  category: "codec",
  title: { zh: "Base32 编解码", en: "Base32 Encode / Decode" },
  description: {
    zh: "RFC 4648 Base32 编解码",
    en: "RFC 4648 Base32 encode and decode",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.base32",
  roots: ["converter"],
  engine: { name: "base32-rfc4648", upstream: "RFC 4648", version: "0.1.0" },
  seoKeywords: {
    zh: "base32编码,base32解码",
    en: "base32 encode online, base32 decode, base32 converter",
  },
  inputSchema: z.object({
    text: z.string().max(200_000),
    mode: z.enum(["encode", "decode"]).default("encode"),
  }),
  execute: (input: { text: string; mode?: "encode" | "decode" }) => {
    const mode = input.mode ?? "encode";
    if (mode === "encode") {
      const result = encodeBase32(new TextEncoder().encode(input.text));
      return { result, mode };
    }
    const bytes = decodeBase32(input.text);
    return { result: new TextDecoder().decode(bytes), mode };
  },
});

// ── Multi-hash (competitor “hash generator” one-shot) ───────────────────────

export const multiHashTool = tool({
  id: "hash/multi-hash",
  slug: "multi-hash",
  category: "hash",
  title: { zh: "多算法哈希", en: "Multi-Hash Generator" },
  description: {
    zh: "一次输出 MD5 / SHA-1 / SHA-256 / SHA-512",
    en: "Generate MD5, SHA-1, SHA-256, SHA-512 in one call",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.hash.multi",
  roots: ["generator", "checker"],
  engine: { name: "node:crypto", upstream: "node:crypto createHash", version: "runtime" },
  seoKeywords: {
    zh: "md5在线,sha256在线,哈希生成器",
    en: "md5 hash generator online, sha256 online, hash calculator",
  },
  inputSchema: z.object({
    text: z.string().max(2_000_000),
    encoding: z.enum(["hex", "base64"]).default("hex"),
  }),
  execute: (input: { text: string; encoding?: "hex" | "base64" }) => {
    const encoding = input.encoding ?? "hex";
    const buf = Buffer.from(input.text, "utf8");
    const digests: Record<string, string> = {};
    for (const algo of ["md5", "sha1", "sha256", "sha512"] as const) {
      digests[algo] = createHash(algo).update(buf).digest(encoding);
    }
    return { ...digests, encoding, bytes: buf.length, engine: "node:crypto" };
  },
});

// ── CSS / HTML beautify (Prettier — same engine as monorepo formatters) ─────

export const cssFormatTool = tool({
  id: "dev/css-format",
  slug: "css-format",
  category: "dev",
  title: { zh: "CSS 美化", en: "CSS Beautifier" },
  description: {
    zh: "Prettier CSS 解析器美化（与 CSSO 压缩配对）",
    en: "Prettier CSS parser pretty-print (pairs with CSSO minify)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.css_format",
  roots: ["formatter"],
  engine: {
    name: "prettier",
    upstream: "https://github.com/prettier/prettier",
    version: "3.x",
  },
  seoKeywords: {
    zh: "css美化,css格式化,css beautify",
    en: "css beautifier online, format css, pretty print css",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    indent: z.coerce.number().int().min(1).max(8).default(2),
  }),
  execute: async (input: { text: string; indent?: number }) => {
    const prettier = await import("prettier");
    const result = await prettier.format(input.text, {
      parser: "css",
      tabWidth: input.indent ?? 2,
    });
    return { result, bytes: result.length, engine: "prettier" };
  },
});

export const htmlFormatTool = tool({
  id: "dev/html-format",
  slug: "html-format",
  category: "dev",
  title: { zh: "HTML 美化", en: "HTML Beautifier" },
  description: {
    zh: "Prettier HTML 解析器美化（与 html-minifier-terser 压缩配对）",
    en: "Prettier HTML parser pretty-print (pairs with html-minifier-terser)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.html_format",
  roots: ["formatter"],
  engine: {
    name: "prettier",
    upstream: "https://github.com/prettier/prettier",
    version: "3.x",
  },
  seoKeywords: {
    zh: "html美化,html格式化",
    en: "html beautifier online, format html, pretty print html",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    indent: z.coerce.number().int().min(1).max(8).default(2),
  }),
  execute: async (input: { text: string; indent?: number }) => {
    const prettier = await import("prettier");
    const result = await prettier.format(input.text, {
      parser: "html",
      tabWidth: input.indent ?? 2,
    });
    return { result, bytes: result.length, engine: "prettier" };
  },
});

// ── String similarity (Levenshtein) ─────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, i) => i);
  let curr = new Array<number>(cols).fill(0);
  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length] ?? 0;
}

export const stringSimilarityTool = tool({
  id: "text/string-similarity",
  slug: "string-similarity",
  category: "text",
  title: { zh: "字符串相似度", en: "String Similarity" },
  description: {
    zh: "Levenshtein 距离与相似度百分比",
    en: "Levenshtein distance and similarity ratio",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.string_similarity",
  roots: ["comparator", "analyzer"],
  engine: { name: "levenshtein", upstream: "classic DP", version: "0.1.0" },
  seoKeywords: {
    zh: "字符串相似度,编辑距离,levenshtein",
    en: "string similarity online, levenshtein distance calculator",
  },
  inputSchema: z.object({
    a: z.string().max(20_000),
    b: z.string().max(20_000),
  }),
  execute: (input: { a: string; b: string }) => {
    const distance = levenshtein(input.a, input.b);
    const maxLen = Math.max(input.a.length, input.b.length, 1);
    const similarity = Math.round((1 - distance / maxLen) * 10000) / 100;
    return {
      distance,
      similarity,
      percent: `${similarity}%`,
      lengthA: input.a.length,
      lengthB: input.b.length,
    };
  },
});

// ── Roman numerals ──────────────────────────────────────────────────────────

const ROMAN: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRoman(n: number): string {
  let x = n;
  let out = "";
  for (const [v, s] of ROMAN) {
    while (x >= v) {
      out += s;
      x -= v;
    }
  }
  return out;
}

function fromRoman(s: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const up = s.toUpperCase().replace(/[^IVXLCDM]/g, "");
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = map[up[i]!] ?? 0;
    const next = map[up[i + 1]!] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

export const romanNumeralsTool = tool({
  id: "life/roman-numerals",
  slug: "roman-numerals",
  category: "life",
  title: { zh: "罗马数字", en: "Roman Numerals" },
  description: {
    zh: "阿拉伯数字 ⇄ 罗马数字",
    en: "Arabic ↔ Roman numerals converter",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.roman",
  roots: ["converter", "calculator"],
  engine: { name: "roman", upstream: "standard roman mapping", version: "0.1.0" },
  seoKeywords: {
    zh: "罗马数字转换,roman numerals",
    en: "roman numerals converter online, number to roman",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(100),
    mode: z.enum(["to_roman", "from_roman"]).default("to_roman"),
  }),
  execute: (input: { text: string; mode?: "to_roman" | "from_roman" }) => {
    const mode = input.mode ?? "to_roman";
    if (mode === "to_roman") {
      const n = Number.parseInt(input.text.trim(), 10);
      if (!Number.isFinite(n) || n < 1 || n > 3999) {
        throw new Error("Number must be an integer from 1 to 3999");
      }
      return { result: toRoman(n), value: n, mode };
    }
    const value = fromRoman(input.text);
    if (value <= 0) throw new Error("Invalid roman numeral");
    return { result: String(value), value, mode };
  },
});

// ── Age calculator ──────────────────────────────────────────────────────────

export const ageCalculatorTool = tool({
  id: "life/age-calculator",
  slug: "age-calculator",
  category: "life",
  title: { zh: "年龄计算", en: "Age Calculator" },
  description: {
    zh: "根据出生日期计算精确年龄",
    en: "Calculate exact age from birth date",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.age",
  roots: ["calculator"],
  engine: { name: "date-diff-age", upstream: "ECMAScript Date", version: "0.1.0" },
  seoKeywords: {
    zh: "年龄计算器,出生日期算年龄",
    en: "age calculator online, calculate age from date of birth",
  },
  inputSchema: z.object({
    birthDate: z.string().min(4).max(32),
    asOf: z.string().max(32).optional(),
  }),
  execute: (input: { birthDate: string; asOf?: string }) => {
    const birth = new Date(input.birthDate);
    const asOf = input.asOf ? new Date(input.asOf) : new Date();
    if (Number.isNaN(birth.getTime()) || Number.isNaN(asOf.getTime())) {
      throw new Error("Invalid date. Use YYYY-MM-DD");
    }
    if (birth > asOf) throw new Error("Birth date cannot be after as-of date");
    let years = asOf.getFullYear() - birth.getFullYear();
    let months = asOf.getMonth() - birth.getMonth();
    let days = asOf.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      const prev = new Date(asOf.getFullYear(), asOf.getMonth(), 0);
      days += prev.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const totalDays = Math.floor((asOf.getTime() - birth.getTime()) / 86_400_000);
    return {
      years,
      months,
      days,
      totalDays,
      human: `${years}y ${months}m ${days}d`,
      birthDate: birth.toISOString().slice(0, 10),
      asOf: asOf.toISOString().slice(0, 10),
    };
  },
});

// ── Tip calculator ──────────────────────────────────────────────────────────

export const tipCalculatorTool = tool({
  id: "life/tip-calculator",
  slug: "tip-calculator",
  category: "life",
  title: { zh: "小费计算", en: "Tip Calculator" },
  description: {
    zh: "按比例与人数分摊小费",
    en: "Calculate tip and split by party size",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.tip",
  roots: ["calculator"],
  engine: { name: "tip-math", upstream: "arithmetic", version: "0.1.0" },
  seoKeywords: {
    zh: "小费计算器,餐厅小费",
    en: "tip calculator online, gratuity calculator, split bill tip",
  },
  inputSchema: z.object({
    bill: z.coerce.number().positive().max(1_000_000),
    tipPercent: z.coerce.number().min(0).max(100).default(15),
    people: z.coerce.number().int().min(1).max(100).default(1),
  }),
  execute: (input: { bill: number; tipPercent?: number; people?: number }) => {
    const tipPercent = input.tipPercent ?? 15;
    const people = input.people ?? 1;
    const tip = Math.round(input.bill * (tipPercent / 100) * 100) / 100;
    const total = Math.round((input.bill + tip) * 100) / 100;
    const perPerson = Math.round((total / people) * 100) / 100;
    return {
      bill: input.bill,
      tipPercent,
      tip,
      total,
      people,
      perPerson,
    };
  },
});

// ── Aspect ratio ────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export const aspectRatioTool = tool({
  id: "dev/aspect-ratio",
  slug: "aspect-ratio",
  category: "dev",
  title: { zh: "宽高比计算", en: "Aspect Ratio Calculator" },
  description: {
    zh: "分辨率化简为比例，或按比例求宽高",
    en: "Simplify resolution to ratio, or solve width/height from ratio",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.aspect_ratio",
  roots: ["calculator"],
  engine: { name: "gcd-ratio", upstream: "Euclidean GCD", version: "0.1.0" },
  seoKeywords: {
    zh: "宽高比计算,aspect ratio,分辨率比例",
    en: "aspect ratio calculator online, resolution to ratio",
  },
  inputSchema: z.object({
    width: z.coerce.number().positive().max(100_000),
    height: z.coerce.number().positive().max(100_000),
  }),
  execute: (input: { width: number; height: number }) => {
    const w = Math.round(input.width);
    const h = Math.round(input.height);
    const g = gcd(w, h);
    const rw = w / g;
    const rh = h / g;
    return {
      width: w,
      height: h,
      ratio: `${rw}:${rh}`,
      decimal: Math.round((w / h) * 10000) / 10000,
      simplified: { w: rw, h: rh },
    };
  },
});

// ── MIME from extension ─────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  xml: "application/xml",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  wasm: "application/wasm",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  yaml: "application/yaml",
  yml: "application/yaml",
  toml: "application/toml",
  ts: "text/typescript",
  tsx: "text/tsx",
  jsx: "text/jsx",
};

export const mimeLookupTool = tool({
  id: "dev/mime-lookup",
  slug: "mime-lookup",
  category: "dev",
  title: { zh: "MIME 类型查询", en: "MIME Type Lookup" },
  description: {
    zh: "按扩展名查询常见 MIME 类型",
    en: "Lookup common MIME types by file extension",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.mime_lookup",
  roots: ["checker", "viewer"],
  engine: { name: "mime-table", upstream: "common web MIME map", version: "0.1.0" },
  seoKeywords: {
    zh: "mime类型查询,文件扩展名mime",
    en: "mime type lookup online, file extension mime type",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(5_000),
  }),
  execute: (input: { text: string }) => {
    const lines = input.text
      .split(/\r\n|\r|\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
    const results = lines.map((raw) => {
      const base = raw.includes("/") ? raw.split("/").pop()! : raw;
      const ext = base.includes(".") ? (base.split(".").pop() ?? base) : base;
      const key = ext.toLowerCase().replace(/^\./, "");
      const mime = MIME[key] ?? null;
      return { input: raw, extension: key, mime, known: mime !== null };
    });
    return {
      results,
      knownCount: results.filter((r) => r.known).length,
      unknownCount: results.filter((r) => !r.known).length,
    };
  },
});

// ── User-Agent parse (ua-parser-js — maintained industry parser) ────────────

export const userAgentParseTool = tool({
  id: "dev/user-agent-parse",
  slug: "user-agent-parse",
  category: "dev",
  title: { zh: "UA 解析", en: "User-Agent Parser" },
  description: {
    zh: "ua-parser-js 解析浏览器 / 引擎 / OS / 设备 / CPU",
    en: "ua-parser-js — browser, engine, OS, device, and CPU from a User-Agent string",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.ua_parse",
  roots: ["analyzer", "viewer"],
  engine: {
    name: "ua-parser-js",
    upstream: "https://github.com/faisalman/ua-parser-js",
    version: "2.x",
  },
  seoKeywords: {
    zh: "user agent解析,ua分析",
    en: "user agent parser online, parse user agent string",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(2_000),
  }),
  execute: async (input: { text: string }) => {
    const { UAParser } = await import("ua-parser-js");
    const ua = input.text.trim();
    const result = new UAParser(ua).getResult();
    const deviceType = result.device.type ?? "desktop";
    const isBot =
      result.browser.type === "bot" ||
      /bot|crawl|spider|slurp|bingpreview/i.test(ua);
    return {
      ua,
      browser: result.browser.name ?? "Unknown",
      browserVersion: result.browser.version ?? null,
      engine: result.engine.name ?? null,
      engineVersion: result.engine.version ?? null,
      os: [result.os.name, result.os.version].filter(Boolean).join(" ") || "Unknown",
      device: isBot ? "bot" : deviceType,
      deviceVendor: result.device.vendor ?? null,
      deviceModel: result.device.model ?? null,
      cpu: result.cpu.architecture ?? null,
      isBot,
      parser: "ua-parser-js",
    };
  },
});

// ── Image metadata via sharp (optional peer, honest fallback) ───────────────

export const imageMetaTool = tool({
  id: "image/image-meta",
  slug: "image-meta",
  category: "image",
  title: { zh: "图片元数据", en: "Image Metadata" },
  description: {
    zh: "sharp 读取宽高/格式/方向等（EXIF 缓冲摘要）",
    en: "Read width/height/format/orientation via sharp (EXIF buffer summary)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.meta",
  roots: ["viewer", "extractor", "analyzer"],
  engine: { name: "sharp", upstream: "lovell/sharp", version: "0.34.x" },
  seoKeywords: {
    zh: "图片信息,图片元数据,exif查看",
    en: "image metadata viewer online, photo exif info, image dimensions",
  },
  inputSchema: z.object({
    imageBase64: z.string().min(1),
  }),
  execute: async (input: { imageBase64: string }) => {
    const cleaned = input.imageBase64.includes(",")
      ? (input.imageBase64.split(",").pop() ?? input.imageBase64)
      : input.imageBase64;
    const buf = Buffer.from(cleaned, "base64");
    try {
      const sharpMod = (await import("sharp")) as unknown as {
        default?: (input?: Buffer) => { metadata: () => Promise<Record<string, unknown>> };
      } & ((input?: Buffer) => { metadata: () => Promise<Record<string, unknown>> });
      const sharp = sharpMod.default ?? sharpMod;
      const meta = await sharp(buf).metadata();
      return {
        format: meta.format ?? null,
        width: meta.width ?? null,
        height: meta.height ?? null,
        space: meta.space ?? null,
        channels: meta.channels ?? null,
        depth: meta.depth ?? null,
        density: meta.density ?? null,
        orientation: meta.orientation ?? null,
        hasProfile: Boolean(meta.hasProfile),
        hasAlpha: Boolean(meta.hasAlpha),
        isProgressive: Boolean(meta.isProgressive),
        exifBytes: meta.exif ? (meta.exif as Buffer).length : 0,
        iccBytes: meta.icc ? (meta.icc as Buffer).length : 0,
        bytes: buf.length,
        engine: "sharp",
        note:
          meta.exif && (meta.exif as Buffer).length > 0
            ? "Raw EXIF present (byte length only). Full tag decode can use exifr in a later blade."
            : "No EXIF buffer in this image.",
      };
    } catch (err) {
      throw new Error(
        `image-meta requires sharp: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
});

// ── Word frequency ──────────────────────────────────────────────────────────

export const wordFrequencyTool = tool({
  id: "text/word-frequency",
  slug: "word-frequency",
  category: "text",
  title: { zh: "词频统计", en: "Word Frequency" },
  description: {
    zh: "统计词/字出现次数（中英混排）",
    en: "Count word/token frequencies (CJK + Latin)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.word_frequency",
  roots: ["analyzer"],
  engine: { name: "freq-counter", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "词频统计,字频分析",
    en: "word frequency counter online, word cloud data",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    top: z.coerce.number().int().min(1).max(200).default(50),
  }),
  execute: (input: { text: string; top?: number }) => {
    const top = input.top ?? 50;
    const counts = new Map<string, number>();
    // Latin words
    for (const w of input.text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    // CJK unigrams (simple; good enough for SEO tool)
    for (const ch of input.text.match(/[\u4e00-\u9fff]/g) ?? []) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, top)
      .map(([token, count]) => ({ token, count }));
    return { totalUnique: counts.size, top: ranked };
  },
});

// ── JSON ↔ XML ──────────────────────────────────────────────────────────────

export const jsonXmlTool = tool({
  id: "data/json-xml",
  slug: "json-xml",
  category: "data",
  title: { zh: "JSON ⇄ XML", en: "JSON ↔ XML" },
  description: {
    zh: "fast-xml-parser 双向转换",
    en: "Convert between JSON and XML via fast-xml-parser",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.json_xml",
  roots: ["converter"],
  engine: {
    name: "fast-xml-parser",
    upstream: "https://github.com/NaturalIntelligence/fast-xml-parser",
    version: "5.x",
  },
  seoKeywords: {
    zh: "json转xml,xml转json",
    en: "json to xml converter online, xml to json",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    mode: z.enum(["json_to_xml", "xml_to_json"]).default("json_to_xml"),
    rootName: z.string().min(1).max(64).default("root"),
  }),
  execute: (input: { text: string; mode?: "json_to_xml" | "xml_to_json"; rootName?: string }) => {
    const mode = input.mode ?? "json_to_xml";
    const rootName = input.rootName ?? "root";
    if (mode === "json_to_xml") {
      const data = JSON.parse(input.text) as unknown;
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        indentBy: "  ",
      });
      const wrapped =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? data
          : { [rootName]: data };
      // If already has single root-like shape, still wrap for stability
      const payload =
        Object.keys(wrapped as object).length === 1 ? wrapped : { [rootName]: wrapped };
      const result = builder.build(payload);
      return { result, mode, engine: "fast-xml-parser" };
    }
    const validation = XMLValidator.validate(input.text);
    if (validation !== true) throw new Error("Invalid XML");
    const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
    const data = parser.parse(input.text);
    return {
      result: JSON.stringify(data, null, 2),
      mode,
      engine: "fast-xml-parser",
    };
  },
});

// ── SQL minify ──────────────────────────────────────────────────────────────

export const sqlMinifyTool = tool({
  id: "dev/sql-minify",
  slug: "sql-minify",
  category: "dev",
  title: { zh: "SQL 压缩", en: "SQL Minifier" },
  description: {
    zh: "去掉 SQL 注释与多余空白",
    en: "Strip SQL comments and excess whitespace",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.sql_minify",
  roots: ["optimizer", "formatter"],
  engine: { name: "sql-collapse", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "sql压缩,sql minify",
    en: "sql minifier online, minify sql, compress sql",
  },
  inputSchema: z.object({ text: z.string().max(500_000) }),
  execute: (input: { text: string }) => {
    const result = input.text
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\n\r]*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      result,
      bytesIn: input.text.length,
      bytesOut: result.length,
      saved: Math.max(0, input.text.length - result.length),
    };
  },
});

// ── Line numbers ────────────────────────────────────────────────────────────

export const lineNumberTool = tool({
  id: "text/line-numbers",
  slug: "line-numbers",
  category: "text",
  title: { zh: "添加行号", en: "Add Line Numbers" },
  description: {
    zh: "为每行文本添加行号前缀",
    en: "Prefix each line with a line number",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.line_numbers",
  roots: ["formatter"],
  engine: { name: "line-index", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "文本加行号,line numbers",
    en: "add line numbers online, number lines of text",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    start: z.coerce.number().int().min(0).max(1_000_000).default(1),
    pad: z.coerce.number().int().min(0).max(8).default(0),
  }),
  execute: (input: { text: string; start?: number; pad?: number }) => {
    const start = input.start ?? 1;
    const pad = input.pad ?? 0;
    const lines = input.text.split(/\r\n|\r|\n/);
    const width = pad > 0 ? pad : String(start + lines.length - 1).length;
    const result = lines
      .map((line, i) => `${String(start + i).padStart(width, "0")}  ${line}`)
      .join("\n");
    return { result, lines: lines.length, start };
  },
});

// ── Remove duplicate words (order-preserving) ───────────────────────────────

export const uniqueWordsTool = tool({
  id: "text/unique-words",
  slug: "unique-words",
  category: "text",
  title: { zh: "单词去重", en: "Unique Words" },
  description: {
    zh: "按出现顺序去重单词（空格分词）",
    en: "Deduplicate words preserving first-seen order",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.unique_words",
  roots: ["optimizer"],
  engine: { name: "word-dedupe", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "单词去重,remove duplicate words",
    en: "remove duplicate words online, unique words list",
  },
  inputSchema: z.object({
    text: z.string().max(200_000),
    caseSensitive: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((v) => v === true || v === "true")
      .default(false),
  }),
  execute: (input: { text: string; caseSensitive?: boolean }) => {
    const caseSensitive = input.caseSensitive === true;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of input.text.split(/\s+/).filter(Boolean)) {
      const key = caseSensitive ? w : w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
    return { result: out.join(" "), count: out.length, caseSensitive };
  },
});

// ── Epoch millis converter (pair with unix-timestamp) ───────────────────────

export const epochConvertTool = tool({
  id: "time/epoch-convert",
  slug: "epoch-convert",
  category: "time",
  title: { zh: "Epoch 毫秒转换", en: "Epoch Milliseconds" },
  description: {
    zh: "毫秒时间戳 ⇄ ISO 8601",
    en: "Milliseconds epoch ↔ ISO 8601",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.time.epoch_ms",
  roots: ["converter", "calculator"],
  engine: { name: "Date", upstream: "ECMAScript Date", version: "runtime" },
  seoKeywords: {
    zh: "毫秒时间戳,epoch converter,时间戳转换",
    en: "epoch converter milliseconds, unix timestamp ms to date",
  },
  inputSchema: z.object({
    value: z.string().min(1).max(64),
    mode: z.enum(["ms_to_iso", "iso_to_ms"]).default("ms_to_iso"),
  }),
  execute: (input: { value: string; mode?: "ms_to_iso" | "iso_to_ms" }) => {
    const mode = input.mode ?? "ms_to_iso";
    if (mode === "ms_to_iso") {
      const n = Number(input.value);
      if (!Number.isFinite(n)) throw new Error("Invalid milliseconds value");
      const d = new Date(n);
      if (Number.isNaN(d.getTime())) throw new Error("Out of range date");
      return { result: d.toISOString(), ms: n, mode };
    }
    const d = new Date(input.value);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid ISO date");
    return { result: String(d.getTime()), ms: d.getTime(), mode, iso: d.toISOString() };
  },
});

// ── Password entropy bits (pair strength) ───────────────────────────────────

export const passwordEntropyTool = tool({
  id: "hash/password-entropy",
  slug: "password-entropy",
  category: "hash",
  title: { zh: "密码熵估算", en: "Password Entropy" },
  description: {
    zh: "按字符集估算密码熵（bit）",
    en: "Estimate password entropy bits from charset size",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.hash.password_entropy",
  roots: ["analyzer", "checker"],
  engine: { name: "charset-entropy", upstream: "log2(pool^len)", version: "0.1.0" },
  seoKeywords: {
    zh: "密码熵,password entropy,密码强度bit",
    en: "password entropy calculator online, entropy bits",
  },
  inputSchema: z.object({
    password: z.string().min(1).max(512),
  }),
  execute: (input: { password: string }) => {
    const p = input.password;
    let pool = 0;
    if (/[a-z]/.test(p)) pool += 26;
    if (/[A-Z]/.test(p)) pool += 26;
    if (/[0-9]/.test(p)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(p)) pool += 33;
    if (pool === 0) pool = 1;
    const bits = Math.round(p.length * Math.log2(pool) * 100) / 100;
    const score = bits < 28 ? "weak" : bits < 36 ? "fair" : bits < 60 ? "strong" : "very_strong";
    return {
      length: p.length,
      charsetSize: pool,
      bits,
      score,
      note: "Heuristic charset entropy only — not a substitute for zxcvbn/password-strength.",
    };
  },
});

// ── Color contrast (WCAG) ───────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error("Expected #RGB or #RRGGBB");
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export const colorContrastTool = tool({
  id: "dev/color-contrast",
  slug: "color-contrast",
  category: "dev",
  title: { zh: "颜色对比度", en: "Color Contrast (WCAG)" },
  description: {
    zh: "计算两色对比度并给出 WCAG AA/AAA 判定",
    en: "WCAG contrast ratio and AA/AAA pass/fail",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.color_contrast",
  roots: ["checker", "analyzer"],
  engine: { name: "wcag-contrast", upstream: "WCAG 2.x relative luminance", version: "0.1.0" },
  seoKeywords: {
    zh: "颜色对比度,wcag对比度,无障碍配色",
    en: "color contrast checker online, wcag contrast ratio",
  },
  inputSchema: z.object({
    foreground: z.string().min(3).max(16).default("#000000"),
    background: z.string().min(3).max(16).default("#ffffff"),
  }),
  execute: (input: { foreground?: string; background?: string }) => {
    const fg = hexToRgb(input.foreground ?? "#000000");
    const bg = hexToRgb(input.background ?? "#ffffff");
    const L1 = relativeLuminance(fg);
    const L2 = relativeLuminance(bg);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
    return {
      ratio,
      ratioLabel: `${ratio}:1`,
      aaNormal: ratio >= 4.5,
      aaLarge: ratio >= 3,
      aaaNormal: ratio >= 7,
      aaaLarge: ratio >= 4.5,
      foreground: input.foreground ?? "#000000",
      background: input.background ?? "#ffffff",
    };
  },
});

export const wave3StapleTools: readonly AnyForgeToolDefinition[] = [
  rot13Tool,
  morseTool,
  textBinaryTool,
  base32Tool,
  multiHashTool,
  cssFormatTool,
  htmlFormatTool,
  stringSimilarityTool,
  romanNumeralsTool,
  ageCalculatorTool,
  tipCalculatorTool,
  aspectRatioTool,
  mimeLookupTool,
  userAgentParseTool,
  imageMetaTool,
  wordFrequencyTool,
  jsonXmlTool,
  sqlMinifyTool,
  lineNumberTool,
  uniqueWordsTool,
  epochConvertTool,
  passwordEntropyTool,
  colorContrastTool,
];

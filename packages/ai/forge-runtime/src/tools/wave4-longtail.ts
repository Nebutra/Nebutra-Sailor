/**
 * Wave-4 long-tail pure tools — SEO density + agent utility.
 * EXIF prefers `exifr` wheel with pure JPEG APP1 fallback.
 */
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

// ── EXIF viewer ─────────────────────────────────────────────────────────────

const EXIF_TAGS: Record<number, string> = {
  271: "Make",
  272: "Model",
  274: "Orientation",
  282: "XResolution",
  283: "YResolution",
  296: "ResolutionUnit",
  305: "Software",
  306: "DateTime",
  315: "Artist",
  33432: "Copyright",
  33434: "ExposureTime",
  33437: "FNumber",
  34855: "ISO",
  36867: "DateTimeOriginal",
  36868: "DateTimeDigitized",
  37386: "FocalLength",
  40962: "PixelXDimension",
  40963: "PixelYDimension",
  41989: "FocalLengthIn35mmFilm",
};

function readU16(view: DataView, offset: number, le: boolean): number {
  return le ? view.getUint16(offset, true) : view.getUint16(offset, false);
}
function readU32(view: DataView, offset: number, le: boolean): number {
  return le ? view.getUint32(offset, true) : view.getUint32(offset, false);
}

function parseJpegExifPure(buf: Buffer): Record<string, string | number> | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1]!;
    const size = buf.readUInt16BE(offset + 2);
    if (marker === 0xe1 && size > 8) {
      const start = offset + 4;
      const head = buf.subarray(start, start + 6).toString("ascii");
      if (!head.startsWith("Exif")) break;
      const tiff = start + 6;
      if (tiff + 8 > buf.length) break;
      const le = buf[tiff] === 0x49 && buf[tiff + 1] === 0x49;
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const ifd0 = tiff + readU32(view, tiff + 4, le);
      if (ifd0 + 2 > buf.length) break;
      const count = readU16(view, ifd0, le);
      const out: Record<string, string | number> = {};
      for (let i = 0; i < count; i++) {
        const entry = ifd0 + 2 + i * 12;
        if (entry + 12 > buf.length) break;
        const tag = readU16(view, entry, le);
        const type = readU16(view, entry + 2, le);
        const num = readU32(view, entry + 4, le);
        const name = EXIF_TAGS[tag];
        if (!name) continue;
        let valueOffset = entry + 8;
        const unit = type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 ? 8 : 1;
        if (num * unit > 4) valueOffset = tiff + readU32(view, entry + 8, le);
        if (type === 2) {
          const len = Math.min(num, 256);
          if (valueOffset + len <= buf.length) {
            out[name] = buf
              .subarray(valueOffset, valueOffset + len)
              .toString("utf8")
              .replace(/\0+$/, "");
          }
        } else if (type === 3 && num >= 1) {
          out[name] = readU16(view, valueOffset, le);
        } else if (type === 4 && num >= 1) {
          out[name] = readU32(view, valueOffset, le);
        } else if (type === 5 && num >= 1 && valueOffset + 8 <= buf.length) {
          const n = readU32(view, valueOffset, le);
          const d = readU32(view, valueOffset + 4, le) || 1;
          out[name] = Math.round((n / d) * 1000) / 1000;
        }
      }
      return Object.keys(out).length ? out : null;
    }
    if (marker === 0xda) break;
    offset += 2 + size;
  }
  return null;
}

function sanitizeExifValue(v: unknown): unknown {
  if (v instanceof Uint8Array || Buffer.isBuffer(v)) return `<binary ${v.length} bytes>`;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null) {
    try {
      JSON.stringify(v);
      return v;
    } catch {
      return String(v);
    }
  }
  return v;
}

export const exifViewerTool = tool({
  id: "image/exif-viewer",
  slug: "exif-viewer",
  category: "image",
  title: { zh: "EXIF 查看器", en: "EXIF Viewer" },
  description: {
    zh: "读取照片 EXIF（exifr 优先，JPEG 纯解析回落）",
    en: "Read photo EXIF (exifr preferred, pure JPEG fallback)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.exif",
  roots: ["viewer", "extractor", "analyzer"],
  engine: {
    name: "exifr|jpeg-pure",
    upstream: "https://github.com/MikeKovarik/exifr + pure JPEG APP1",
    version: "0.2.0",
  },
  seoKeywords: {
    zh: "exif查看器,照片信息,exif在线",
    en: "exif viewer online, photo metadata, view exif data",
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
      const mod = (await import("exifr")) as {
        parse?: (data: Buffer, opts?: object) => Promise<Record<string, unknown> | undefined>;
        default?: {
          parse?: (data: Buffer, opts?: object) => Promise<Record<string, unknown> | undefined>;
        };
      };
      const parse = mod.parse ?? mod.default?.parse;
      if (parse) {
        const tags = await parse(buf, {
          tiff: true,
          xmp: true,
          icc: false,
          iptc: true,
          jfif: true,
          ihdr: true,
          mergeOutput: true,
        });
        if (tags && Object.keys(tags).length > 0) {
          const safe: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(tags)) safe[k] = sanitizeExifValue(v);
          return {
            tags: safe,
            tagCount: Object.keys(safe).length,
            bytes: buf.length,
            engine: "exifr",
          };
        }
      }
    } catch {
      // fall through
    }
    const pure = parseJpegExifPure(buf);
    if (pure) {
      return {
        tags: pure,
        tagCount: Object.keys(pure).length,
        bytes: buf.length,
        engine: "jpeg-pure",
        note: "Pure JPEG APP1 subset when full exifr parse is empty.",
      };
    }
    return {
      tags: {},
      tagCount: 0,
      bytes: buf.length,
      engine: "none",
      note: "No EXIF found for this image.",
    };
  },
});

// ── Text optimizers ─────────────────────────────────────────────────────────

export const removeExtraSpacesTool = tool({
  id: "text/remove-extra-spaces",
  slug: "remove-extra-spaces",
  category: "text",
  title: { zh: "去除多余空格", en: "Remove Extra Spaces" },
  description: { zh: "折叠连续空白并 trim", en: "Collapse consecutive whitespace and trim" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.remove_extra_spaces",
  roots: ["optimizer", "formatter"],
  engine: { name: "ws-collapse", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "去除多余空格,压缩空格",
    en: "remove extra spaces online, collapse whitespace",
  },
  inputSchema: z.object({ text: z.string().max(500_000) }),
  execute: (input: { text: string }) => ({
    result: input.text
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim(),
  }),
});

export const findReplaceRegexTool = tool({
  id: "text/find-replace-regex",
  slug: "find-replace-regex",
  category: "text",
  title: { zh: "正则查找替换", en: "Regex Find & Replace" },
  description: { zh: "用正则批量替换文本", en: "Bulk replace text with a regular expression" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.find_replace_regex",
  roots: ["editor", "converter"],
  engine: { name: "RegExp", upstream: "ECMAScript RegExp", version: "runtime" },
  seoKeywords: {
    zh: "正则替换,regex replace在线",
    en: "regex find replace online, regular expression replace",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    pattern: z.string().min(1).max(500),
    replacement: z.string().max(10_000).default(""),
    flags: z.string().max(10).default("g"),
  }),
  execute: (input: { text: string; pattern: string; replacement?: string; flags?: string }) => {
    const flags = (input.flags ?? "g").replace(/[^gimsuy]/g, "");
    let re: RegExp;
    try {
      re = new RegExp(input.pattern, flags.includes("g") ? flags : `${flags}g`);
    } catch (err) {
      throw new Error(`Invalid regex: ${err instanceof Error ? err.message : String(err)}`);
    }
    const replacement = input.replacement ?? "";
    const matches = input.text.match(re)?.length ?? 0;
    return {
      result: input.text.replace(re, replacement),
      matches,
      pattern: input.pattern,
      flags: re.flags,
    };
  },
});

export const countCharsTool = tool({
  id: "text/count-chars",
  slug: "count-chars",
  category: "text",
  title: { zh: "字符统计", en: "Character Counter" },
  description: {
    zh: "字符/字节/行/空白统计",
    en: "Count characters, bytes, lines, and whitespace",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.count_chars",
  roots: ["analyzer", "calculator"],
  engine: { name: "char-stats", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "字符统计,字数计数器,character counter",
    en: "character counter online, count characters bytes lines",
  },
  inputSchema: z.object({ text: z.string().max(2_000_000) }),
  execute: (input: { text: string }) => {
    const text = input.text;
    const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
    return {
      characters: [...text].length,
      charactersNoSpaces: [...text.replace(/\s/g, "")].length,
      bytesUtf8: new TextEncoder().encode(text).length,
      lines,
      whitespace: (text.match(/\s/g) ?? []).length,
    };
  },
});

// ── CSV lite ────────────────────────────────────────────────────────────────

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export const csvToJsonLiteTool = tool({
  id: "data/csv-to-json-lite",
  slug: "csv-to-json-lite",
  category: "data",
  title: { zh: "CSV → JSON（轻量）", en: "CSV to JSON (Lite)" },
  description: {
    zh: "首行表头 CSV 转 JSON 数组",
    en: "Header-row CSV to JSON array",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.csv_to_json_lite",
  roots: ["converter"],
  engine: { name: "csv-lite", upstream: "nebutra pure CSV", version: "0.1.0" },
  seoKeywords: {
    zh: "csv转json,csv to json在线",
    en: "csv to json converter online, convert csv to json",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    delimiter: z.string().min(1).max(2).default(","),
  }),
  execute: (input: { text: string; delimiter?: string }) => {
    const delim = input.delimiter ?? ",";
    const lines = input.text
      .replace(/^\uFEFF/, "")
      .split(/\r\n|\r|\n/)
      .filter((l) => l.length > 0);
    if (lines.length === 0) return { result: "[]", rows: 0, columns: [] as string[] };
    const headers = splitCsvLine(lines[0]!, delim);
    const rows = lines.slice(1).map((line) => {
      const cols = splitCsvLine(line, delim);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h || `col${i}`] = cols[i] ?? "";
      });
      return obj;
    });
    return { result: JSON.stringify(rows, null, 2), rows: rows.length, columns: headers };
  },
});

export const jsonToCsvLiteTool = tool({
  id: "data/json-to-csv-lite",
  slug: "json-to-csv-lite",
  category: "data",
  title: { zh: "JSON → CSV（轻量）", en: "JSON to CSV (Lite)" },
  description: { zh: "对象数组 JSON 转 CSV", en: "JSON array of objects to CSV" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.json_to_csv_lite",
  roots: ["converter"],
  engine: { name: "json-csv-lite", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "json转csv,json to csv在线",
    en: "json to csv converter online, convert json to csv",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    delimiter: z.string().min(1).max(2).default(","),
  }),
  execute: (input: { text: string; delimiter?: string }) => {
    const delim = input.delimiter ?? ",";
    const data = JSON.parse(input.text) as unknown;
    if (!Array.isArray(data)) throw new Error("JSON root must be an array of objects");
    const rows = data as Record<string, unknown>[];
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r ?? {})))];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [keys.join(delim), ...rows.map((r) => keys.map((k) => esc(r?.[k])).join(delim))];
    return { result: lines.join("\n"), rows: rows.length, columns: keys };
  },
});

// ── JWT generate HS256 ──────────────────────────────────────────────────────

export const jwtGenerateTool = tool({
  id: "codec/jwt-generate",
  slug: "jwt-generate",
  category: "codec",
  title: { zh: "JWT 生成（HS256）", en: "JWT Generate (HS256)" },
  description: {
    zh: "用密钥签发 HS256 JWT（开发/测试）",
    en: "Sign HS256 JWT with a secret (dev/test)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.codec.jwt_generate",
  roots: ["generator"],
  engine: { name: "hmac-sha256-jwt", upstream: "JWT compact HS256", version: "0.1.0" },
  seoKeywords: {
    zh: "jwt生成,jwt在线生成,hs256",
    en: "jwt generator online, create jwt hs256, jwt encoder",
  },
  inputSchema: z.object({
    payload: z.string().min(2).max(50_000),
    secret: z.string().min(1).max(512),
    expiresInSec: z.coerce.number().int().min(0).max(31_536_000).default(3600),
  }),
  execute: (input: { payload: string; secret: string; expiresInSec?: number }) => {
    const claims = JSON.parse(input.payload) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const expSec = input.expiresInSec ?? 3600;
    if (expSec > 0 && claims.exp == null) claims.exp = now + expSec;
    if (claims.iat == null) claims.iat = now;
    const header = { alg: "HS256", typ: "JWT" };
    const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    const body = `${enc(header)}.${enc(claims)}`;
    const signature = createHmac("sha256", input.secret).update(body).digest("base64url");
    return { token: `${body}.${signature}`, header, payload: claims, algorithm: "HS256" };
  },
});

// ── Random integer / dice / UUID v1-style time ──────────────────────────────

export const randomNumberTool = tool({
  id: "dev/random-number",
  slug: "random-number",
  category: "dev",
  title: { zh: "随机数生成", en: "Random Number Generator" },
  description: {
    zh: "密码学安全随机整数（范围）",
    en: "Cryptographically strong random integers in a range",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.random_number",
  roots: ["generator"],
  engine: { name: "crypto.randomInt", upstream: "node:crypto", version: "runtime" },
  seoKeywords: {
    zh: "随机数生成器,random number",
    en: "random number generator online, random integer",
  },
  inputSchema: z.object({
    min: z.coerce.number().int().min(-1_000_000_000).max(1_000_000_000).default(1),
    max: z.coerce.number().int().min(-1_000_000_000).max(1_000_000_000).default(100),
    count: z.coerce.number().int().min(1).max(100).default(1),
  }),
  execute: (input: { min?: number; max?: number; count?: number }) => {
    const min = input.min ?? 1;
    const max = input.max ?? 100;
    if (max < min) throw new Error("max must be >= min");
    const count = input.count ?? 1;
    const numbers = Array.from({ length: count }, () => randomInt(min, max + 1));
    return { numbers, min, max, count };
  },
});

export const diceRollTool = tool({
  id: "life/dice-roll",
  slug: "dice-roll",
  category: "life",
  title: { zh: "掷骰子", en: "Dice Roller" },
  description: { zh: "NdM 掷骰（密码学随机）", en: "Roll NdM dice (crypto RNG)" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.life.dice",
  roots: ["generator", "simulator"],
  engine: { name: "crypto.randomInt", upstream: "node:crypto", version: "runtime" },
  seoKeywords: {
    zh: "掷骰子,骰子模拟,dice roller",
    en: "dice roller online, roll dice, ndm dice",
  },
  inputSchema: z.object({
    sides: z.coerce.number().int().min(2).max(1000).default(6),
    count: z.coerce.number().int().min(1).max(100).default(1),
  }),
  execute: (input: { sides?: number; count?: number }) => {
    const sides = input.sides ?? 6;
    const count = input.count ?? 1;
    const rolls = Array.from({ length: count }, () => randomInt(1, sides + 1));
    return { rolls, sides, count, total: rolls.reduce((a, b) => a + b, 0) };
  },
});

export const hexToRgbTool = tool({
  id: "dev/hex-rgb",
  slug: "hex-rgb",
  category: "dev",
  title: { zh: "HEX ⇄ RGB", en: "HEX ↔ RGB" },
  description: { zh: "颜色 HEX 与 RGB 互转", en: "Convert between HEX and RGB colors" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.hex_rgb",
  roots: ["converter"],
  engine: { name: "color-hex-rgb", upstream: "nebutra pure", version: "0.1.0" },
  seoKeywords: {
    zh: "hex转rgb,rgb转hex,颜色转换",
    en: "hex to rgb converter online, rgb to hex",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(64),
    mode: z.enum(["hex_to_rgb", "rgb_to_hex"]).default("hex_to_rgb"),
  }),
  execute: (input: { text: string; mode?: "hex_to_rgb" | "rgb_to_hex" }) => {
    const mode = input.mode ?? "hex_to_rgb";
    if (mode === "hex_to_rgb") {
      const h = input.text.replace("#", "").trim();
      const full =
        h.length === 3
          ? h
              .split("")
              .map((c) => c + c)
              .join("")
          : h;
      if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error("Expected #RGB or #RRGGBB");
      const n = Number.parseInt(full, 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return { result: `rgb(${r}, ${g}, ${b})`, r, g, b, hex: `#${full.toLowerCase()}`, mode };
    }
    const m = /(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(input.text);
    if (!m) throw new Error("Expected rgb like 0,128,255");
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    if ([r, g, b].some((x) => x < 0 || x > 255)) throw new Error("RGB channels must be 0–255");
    const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    return { result: hex, r, g, b, hex, mode };
  },
});

export const urlParseTool = tool({
  id: "dev/url-parse",
  slug: "url-parse",
  category: "dev",
  title: { zh: "URL 解析", en: "URL Parser" },
  description: {
    zh: "拆解 URL 为协议/主机/路径/查询",
    en: "Parse URL into protocol, host, path, query parts",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.url_parse",
  roots: ["viewer", "extractor"],
  engine: { name: "URL", upstream: "WHATWG URL", version: "runtime" },
  seoKeywords: {
    zh: "url解析,url拆解",
    en: "url parser online, parse url components",
  },
  inputSchema: z.object({ text: z.string().min(1).max(10_000) }),
  execute: (input: { text: string }) => {
    const u = new URL(input.text.trim());
    const query: Record<string, string | string[]> = {};
    u.searchParams.forEach((v, k) => {
      if (k in query) {
        const cur = query[k];
        query[k] = Array.isArray(cur) ? [...cur, v] : [cur as string, v];
      } else query[k] = v;
    });
    return {
      href: u.href,
      protocol: u.protocol.replace(/:$/, ""),
      username: u.username || null,
      password: u.password ? "***" : null,
      host: u.host,
      hostname: u.hostname,
      port: u.port || null,
      pathname: u.pathname,
      search: u.search || null,
      hash: u.hash || null,
      origin: u.origin,
      query,
    };
  },
});

export const base64UrlTool = tool({
  id: "codec/base64url",
  slug: "base64url",
  category: "codec",
  title: { zh: "Base64URL 编解码", en: "Base64URL Encode / Decode" },
  description: {
    zh: "URL 安全 Base64（JWT 风格）",
    en: "URL-safe Base64 (JWT-style)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.base64url",
  roots: ["converter"],
  engine: { name: "base64url", upstream: "Buffer base64url", version: "runtime" },
  seoKeywords: {
    zh: "base64url编码,base64url解码",
    en: "base64url encode online, base64url decode",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
    mode: z.enum(["encode", "decode"]).default("encode"),
  }),
  execute: (input: { text: string; mode?: "encode" | "decode" }) => {
    const mode = input.mode ?? "encode";
    if (mode === "encode") {
      return { result: Buffer.from(input.text, "utf8").toString("base64url"), mode };
    }
    return { result: Buffer.from(input.text, "base64url").toString("utf8"), mode };
  },
});

export const hmacVerifyTool = tool({
  id: "hash/hmac-verify",
  slug: "hmac-verify",
  category: "hash",
  title: { zh: "HMAC 校验", en: "HMAC Verify" },
  description: {
    zh: "校验 HMAC-SHA256 签名是否匹配",
    en: "Verify HMAC-SHA256 signature matches payload",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.hash.hmac_verify",
  roots: ["checker", "verifier"],
  engine: { name: "crypto.createHmac", upstream: "node:crypto", version: "runtime" },
  seoKeywords: {
    zh: "hmac校验,hmac verify",
    en: "hmac verify online, check hmac signature",
  },
  inputSchema: z.object({
    message: z.string().max(200_000),
    secret: z.string().min(1).max(1024),
    signature: z.string().min(1).max(512),
    encoding: z.enum(["hex", "base64", "base64url"]).default("hex"),
  }),
  execute: (input: {
    message: string;
    secret: string;
    signature: string;
    encoding?: "hex" | "base64" | "base64url";
  }) => {
    const encoding = input.encoding ?? "hex";
    const expected = createHmac("sha256", input.secret)
      .update(input.message)
      .digest(encoding === "base64url" ? "base64url" : encoding);
    const a = expected.toLowerCase();
    const b = input.signature.trim().toLowerCase();
    // length-safe-ish compare for equal length
    let equal = a.length === b.length;
    if (equal) {
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      equal = diff === 0;
    }
    return { valid: equal, expected, algorithm: "sha256", encoding };
  },
});

export const secretGenerateTool = tool({
  id: "security/secret-generate",
  slug: "secret-generate",
  category: "hash",
  title: { zh: "密钥生成", en: "Secret Key Generator" },
  description: {
    zh: "生成 hex/base64url API 密钥",
    en: "Generate hex/base64url API secrets",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.security.secret_generate",
  roots: ["generator"],
  engine: { name: "crypto.randomBytes", upstream: "node:crypto", version: "runtime" },
  seoKeywords: {
    zh: "密钥生成,api key生成,secret generator",
    en: "secret key generator online, api key generator, random secret",
  },
  inputSchema: z.object({
    bytes: z.coerce.number().int().min(8).max(128).default(32),
    encoding: z.enum(["hex", "base64", "base64url"]).default("hex"),
    count: z.coerce.number().int().min(1).max(20).default(1),
  }),
  execute: (input: {
    bytes?: number;
    encoding?: "hex" | "base64" | "base64url";
    count?: number;
  }) => {
    const bytes = input.bytes ?? 32;
    const encoding = input.encoding ?? "hex";
    const count = input.count ?? 1;
    const secrets = Array.from({ length: count }, () => {
      const buf = randomBytes(bytes);
      if (encoding === "hex") return buf.toString("hex");
      if (encoding === "base64") return buf.toString("base64");
      return buf.toString("base64url");
    });
    return { secrets, bytes, encoding, count };
  },
});

export const md5FileTextTool = tool({
  id: "hash/checksum-text",
  slug: "checksum-text",
  category: "hash",
  title: { zh: "文本校验和", en: "Text Checksum" },
  description: {
    zh: "对文本计算 CRC-like 摘要（MD5+SHA256）",
    en: "MD5 + SHA-256 checksums for text",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.hash.checksum_text",
  roots: ["generator", "checker"],
  engine: { name: "node:crypto", upstream: "createHash", version: "runtime" },
  seoKeywords: {
    zh: "文本md5,文本sha256,checksum",
    en: "text md5 online, sha256 checksum text",
  },
  inputSchema: z.object({ text: z.string().max(2_000_000) }),
  execute: (input: { text: string }) => {
    const buf = Buffer.from(input.text, "utf8");
    return {
      md5: createHash("md5").update(buf).digest("hex"),
      sha256: createHash("sha256").update(buf).digest("hex"),
      bytes: buf.length,
    };
  },
});

export const weekdayTool = tool({
  id: "time/weekday",
  slug: "weekday",
  category: "time",
  title: { zh: "星期几", en: "Day of Week" },
  description: { zh: "查询日期是星期几", en: "Find the weekday for a date" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.time.weekday",
  roots: ["calculator", "viewer"],
  engine: { name: "Date", upstream: "ECMAScript Date", version: "runtime" },
  seoKeywords: {
    zh: "星期几查询,某天星期几",
    en: "what day of the week, day of week calculator",
  },
  inputSchema: z.object({
    date: z.string().min(4).max(32),
  }),
  execute: (input: { date: string }) => {
    const d = new Date(input.date);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const namesZh = ["日", "一", "二", "三", "四", "五", "六"];
    const i = d.getUTCDay();
    return {
      iso: d.toISOString().slice(0, 10),
      weekday: names[i],
      weekdayZh: `星期${namesZh[i]}`,
      dayIndex: i,
    };
  },
});

export const percentageChangeTool = tool({
  id: "life/percentage-change",
  slug: "percentage-change",
  category: "life",
  title: { zh: "涨跌幅计算", en: "Percentage Change" },
  description: {
    zh: "计算从 A 到 B 的涨跌百分比",
    en: "Percent change from A to B",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.percentage_change",
  roots: ["calculator"],
  engine: { name: "pct-change", upstream: "arithmetic", version: "0.1.0" },
  seoKeywords: {
    zh: "涨跌幅计算,百分比变化",
    en: "percentage change calculator, percent increase decrease",
  },
  inputSchema: z.object({
    from: z.coerce.number(),
    to: z.coerce.number(),
  }),
  execute: (input: { from: number; to: number }) => {
    if (input.from === 0) throw new Error("from cannot be 0");
    const change = input.to - input.from;
    const percent = Math.round((change / Math.abs(input.from)) * 10000) / 100;
    return {
      from: input.from,
      to: input.to,
      change,
      percent,
      direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    };
  },
});

export const loremWordsTool = tool({
  id: "text/lorem-words",
  slug: "lorem-words",
  category: "text",
  title: { zh: "随机假词", en: "Lorem Words" },
  description: {
    zh: "生成 N 个 lorem 风格单词",
    en: "Generate N lorem-style words",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.lorem_words",
  roots: ["generator"],
  engine: { name: "lorem-words", upstream: "classic word list", version: "0.1.0" },
  seoKeywords: {
    zh: "假词生成,lorem words",
    en: "lorem words generator, random placeholder words",
  },
  inputSchema: z.object({
    count: z.coerce.number().int().min(1).max(500).default(50),
  }),
  execute: (input: { count?: number }) => {
    const words =
      "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(
        " ",
      );
    const count = input.count ?? 50;
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      out.push(words[i % words.length]!);
    }
    return { result: out.join(" "), count };
  },
});

export const wave4LongtailTools: readonly AnyForgeToolDefinition[] = [
  exifViewerTool,
  removeExtraSpacesTool,
  findReplaceRegexTool,
  countCharsTool,
  csvToJsonLiteTool,
  jsonToCsvLiteTool,
  jwtGenerateTool,
  randomNumberTool,
  diceRollTool,
  hexToRgbTool,
  urlParseTool,
  base64UrlTool,
  hmacVerifyTool,
  secretGenerateTool,
  md5FileTextTool,
  weekdayTool,
  percentageChangeTool,
  loremWordsTool,
];

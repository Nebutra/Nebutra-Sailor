/**
 * High-volume pure tools for Swiss-army density (F0 expansion).
 * One file keeps catalog growth cheap without 40 tiny modules.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition, ForgeToolDefinition } from "../types";

function textTool<TOut>(
  def: Omit<ForgeToolDefinition<{ text: string }, TOut>, "inputSchema" | "execute" | "runtime"> & {
    execute: (text: string) => TOut;
  },
): AnyForgeToolDefinition {
  return {
    ...def,
    runtime: ["client", "server"],
    inputSchema: z.object({ text: z.string() }),
    execute: (input: { text: string }) => def.execute(input.text),
    unitCost: def.unitCost ?? 0,
  } as AnyForgeToolDefinition;
}

export const pureBatchTools: readonly AnyForgeToolDefinition[] = [
  textTool({
    id: "text/sort-lines",
    slug: "sort-lines",
    category: "text",
    title: { zh: "行排序", en: "Sort Lines" },
    description: { zh: "按行字母序排序", en: "Sort lines alphabetically" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.sort_lines",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "文本行排序", en: "sort lines online" },
    sotaStatus: "production",
    execute: (text) => ({
      result: text
        .split(/\r\n|\r|\n/)
        .sort((a, b) => a.localeCompare(b))
        .join("\n"),
    }),
  }),
  textTool({
    id: "text/reverse",
    slug: "reverse-text",
    category: "text",
    title: { zh: "文本倒序", en: "Reverse Text" },
    description: { zh: "反转字符串", en: "Reverse a string" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.reverse",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "字符串反转", en: "reverse string online" },
    sotaStatus: "production",
    execute: (text) => ({ result: [...text].reverse().join("") }),
  }),
  textTool({
    id: "text/unique-lines",
    slug: "unique-lines",
    category: "text",
    title: { zh: "删除重复行", en: "Unique Lines" },
    description: { zh: "去重保留顺序", en: "Deduplicate lines preserving order" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.unique_lines",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "删除重复行", en: "remove duplicate lines" },
    sotaStatus: "production",
    execute: (text) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const line of text.split(/\r\n|\r|\n/)) {
        if (!seen.has(line)) {
          seen.add(line);
          out.push(line);
        }
      }
      return { result: out.join("\n"), uniqueCount: out.length };
    },
  }),
  textTool({
    id: "text/strip-html",
    slug: "strip-html",
    category: "text",
    title: { zh: "去除 HTML", en: "Strip HTML" },
    description: { zh: "去掉 HTML 标签", en: "Remove HTML tags" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.strip_html",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "去除html标签", en: "strip html tags online" },
    sotaStatus: "production",
    execute: (text) => ({ result: text.replace(/<[^>]*>/g, "") }),
  }),
  textTool({
    id: "text/slugify",
    slug: "slugify",
    category: "text",
    title: { zh: "Slug 生成", en: "Slugify" },
    description: { zh: "生成 URL slug", en: "Generate URL-safe slug" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.slugify",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "slug生成", en: "slugify online" },
    sotaStatus: "production",
    execute: (text) => ({
      result: text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    }),
  }),
  textTool({
    id: "text/extract-urls",
    slug: "extract-urls",
    category: "text",
    title: { zh: "提取链接", en: "Extract URLs" },
    description: { zh: "从文本提取 URL", en: "Extract URLs from text" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.extract_urls",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "提取网址", en: "extract urls from text" },
    sotaStatus: "production",
    execute: (text) => ({
      urls: text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) ?? [],
    }),
  }),
  textTool({
    id: "text/extract-emails",
    slug: "extract-emails",
    category: "text",
    title: { zh: "提取邮箱", en: "Extract Emails" },
    description: { zh: "从文本提取邮箱", en: "Extract email addresses" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.text.extract_emails",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "提取邮箱", en: "extract emails online" },
    sotaStatus: "production",
    execute: (text) => ({
      emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [],
    }),
  }),
  textTool({
    id: "codec/hex",
    slug: "hex",
    category: "codec",
    title: { zh: "Hex 编码", en: "Hex Encode/Decode" },
    description: { zh: "UTF-8 ↔ 十六进制", en: "UTF-8 to/from hex" },
    tier: "catalog",
    sideEffect: "pure",
    meterId: "forge.codec.hex",
    engine: { name: "std-buffer", upstream: "Buffer", version: "0.1.0" },
    seoKeywords: { zh: "hex编码", en: "hex encode decode" },
    sotaStatus: "production",
    execute: (text) => ({
      encode: Buffer.from(text, "utf8").toString("hex"),
      // if looks like hex, also try decode
      decode: /^[0-9a-fA-F]+$/.test(text.replace(/\s/g, ""))
        ? Buffer.from(text.replace(/\s/g, ""), "hex").toString("utf8")
        : null,
    }),
  }),
  {
    id: "dev/camel-snake",
    slug: "camel-snake",
    category: "dev",
    title: { zh: "驼峰/下划线", en: "Camel ↔ Snake" },
    description: { zh: "命名风格转换", en: "Convert camelCase and snake_case" },
    tier: "catalog",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.dev.camel_snake",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "驼峰下划线转换", en: "camelCase snake_case converter" },
    sotaStatus: "production",
    inputSchema: z.object({
      text: z.string(),
      mode: z.enum(["to_snake", "to_camel", "to_kebab"]).default("to_snake"),
    }),
    execute: (input: { text: string; mode?: "to_snake" | "to_camel" | "to_kebab" }) => {
      const mode = input.mode ?? "to_snake";
      const t = input.text;
      if (mode === "to_snake") {
        return {
          result: t
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .replace(/[-\s]+/g, "_")
            .toLowerCase(),
        };
      }
      if (mode === "to_kebab") {
        return {
          result: t
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .replace(/[_\s]+/g, "-")
            .toLowerCase(),
        };
      }
      return {
        result: t.toLowerCase().replace(/[-_]+([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
      };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "dev/json-to-ts",
    slug: "json-to-ts",
    category: "dev",
    title: { zh: "JSON → TS 类型草图", en: "JSON to TS types" },
    description: {
      zh: "从 JSON 样本生成 interface 草图",
      en: "Sketch TypeScript interfaces from JSON",
    },
    tier: "catalog",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.dev.json_to_ts",
    engine: { name: "text-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "json转typescript", en: "json to typescript interface" },
    inputSchema: z.object({
      text: z.string(),
      name: z.string().default("Root"),
    }),
    execute: (input: { text: string; name?: string }) => {
      const data: unknown = JSON.parse(input.text);
      const name = input.name ?? "Root";
      return { result: `export interface ${name} ${inferTs(data, 0)}` };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "life/bmi",
    slug: "bmi",
    category: "life",
    title: { zh: "BMI 计算", en: "BMI Calculator" },
    description: { zh: "身体质量指数", en: "Body mass index" },
    tier: "catalog",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.life.bmi",
    engine: { name: "life-utils", upstream: "WHO BMI formula", version: "0.1.0" },
    seoKeywords: { zh: "bmi计算器", en: "bmi calculator online" },
    sotaStatus: "production",
    inputSchema: z.object({
      heightCm: z.number().positive(),
      weightKg: z.number().positive(),
    }),
    execute: (input: { heightCm: number; weightKg: number }) => {
      const m = input.heightCm / 100;
      const bmi = input.weightKg / (m * m);
      let category = "obese";
      if (bmi < 18.5) category = "underweight";
      else if (bmi < 25) category = "normal";
      else if (bmi < 30) category = "overweight";
      return { bmi: Math.round(bmi * 10) / 10, category };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "life/percentage",
    slug: "percentage",
    category: "life",
    title: { zh: "百分比计算", en: "Percentage" },
    description: { zh: "求百分比 / 占比", en: "Percentage of / what percent" },
    tier: "catalog",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.life.percentage",
    engine: { name: "life-utils", upstream: "nebutra pure TS", version: "0.1.0" },
    seoKeywords: { zh: "百分比计算", en: "percentage calculator" },
    sotaStatus: "production",
    inputSchema: z.object({
      mode: z.enum(["percent_of", "is_what_percent"]).default("percent_of"),
      a: z.number(),
      b: z.number(),
    }),
    execute: (input: { mode?: "percent_of" | "is_what_percent"; a: number; b: number }) => {
      const mode = input.mode ?? "percent_of";
      if (mode === "percent_of") {
        return { result: (input.a / 100) * input.b };
      }
      if (input.b === 0) throw new Error("b must not be zero");
      return { result: (input.a / input.b) * 100 };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "unit/data-size",
    slug: "data-size",
    category: "unit",
    title: { zh: "数据单位换算", en: "Data Size Converter" },
    description: { zh: "B/KB/MB/GB/TB", en: "Convert B KB MB GB TB" },
    tier: "core",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.unit.data_size",
    engine: { name: "unit-utils", upstream: "1024-based binary units", version: "0.1.0" },
    seoKeywords: { zh: "mb转gb", en: "mb to gb converter" },
    sotaStatus: "production",
    inputSchema: z.object({
      value: z.number(),
      from: z.enum(["B", "KB", "MB", "GB", "TB"]).default("MB"),
      to: z.enum(["B", "KB", "MB", "GB", "TB"]).default("GB"),
    }),
    execute: (input: {
      value: number;
      from?: "B" | "KB" | "MB" | "GB" | "TB";
      to?: "B" | "KB" | "MB" | "GB" | "TB";
    }) => {
      const order = ["B", "KB", "MB", "GB", "TB"] as const;
      const from = input.from ?? "MB";
      const to = input.to ?? "GB";
      const bytes = input.value * 1024 ** order.indexOf(from);
      const result = bytes / 1024 ** order.indexOf(to);
      return { result, from, to };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "finance/rmb-uppercase",
    slug: "rmb-uppercase",
    category: "life",
    title: { zh: "人民币大写", en: "CNY Uppercase" },
    description: { zh: "金额转中文大写", en: "Chinese uppercase currency amount" },
    tier: "core",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.finance.rmb_uppercase",
    engine: { name: "nzh-lite", upstream: "nebutra CNY algorithm", version: "0.1.0" },
    seoKeywords: { zh: "人民币大写转换", en: "chinese currency uppercase" },
    sotaStatus: "production",
    inputSchema: z.object({ amount: z.number().nonnegative().max(999_999_999_999.99) }),
    execute: (input: { amount: number }) => ({ result: rmbUppercase(input.amount) }),
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "hash/sha1",
    slug: "sha1",
    category: "hash",
    title: { zh: "SHA-1", en: "SHA-1 Hash" },
    description: { zh: "SHA-1 摘要（遗留兼容）", en: "SHA-1 digest (legacy)" },
    tier: "catalog",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.hash.sha1",
    engine: { name: "node-crypto", upstream: "node:crypto", version: "0.1.0" },
    seoKeywords: { zh: "sha1在线", en: "sha1 hash online" },
    sotaStatus: "production",
    inputSchema: z.object({ text: z.string() }),
    execute: async (input: { text: string }) => {
      const { createHash } = await import("node:crypto");
      return {
        hex: createHash("sha1").update(input.text, "utf8").digest("hex"),
        algorithm: "sha1" as const,
      };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
  {
    id: "time/date-diff",
    slug: "date-diff",
    category: "time",
    title: { zh: "日期间隔", en: "Date Diff" },
    description: { zh: "两个日期相差天数", en: "Days between two dates" },
    tier: "catalog",
    sideEffect: "pure",
    runtime: ["client", "server"],
    meterId: "forge.time.date_diff",
    engine: { name: "std-date", upstream: "ECMAScript Date", version: "0.1.0" },
    seoKeywords: { zh: "日期间隔计算", en: "date difference calculator" },
    sotaStatus: "production",
    inputSchema: z.object({
      from: z.string(),
      to: z.string(),
    }),
    execute: (input: { from: string; to: string }) => {
      const a = new Date(input.from).getTime();
      const b = new Date(input.to).getTime();
      if (Number.isNaN(a) || Number.isNaN(b)) throw new Error("Invalid date");
      const days = Math.round((b - a) / (24 * 3600 * 1000));
      return { days, milliseconds: b - a };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition,
];

function inferTs(value: unknown, depth: number): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    return `${inferTs(value[0], depth)}[]`;
  }
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object" && value) {
    const pad = "  ".repeat(depth + 1);
    const close = "  ".repeat(depth);
    const fields = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${pad}${JSON.stringify(k)}: ${inferTs(v, depth + 1)};`)
      .join("\n");
    return `{\n${fields}\n${close}}`;
  }
  return "unknown";
}

/** Simplified CNY uppercase (common invoice form). */
function rmbUppercase(n: number): string {
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const intUnits = ["", "拾", "佰", "仟"];
  const bigUnits = ["", "万", "亿"];
  const fracUnits = ["角", "分"];

  if (n === 0) return "零元整";
  const fixed = Math.round(n * 100);
  const intPart = Math.floor(fixed / 100);
  const frac = fixed % 100;

  const sections: string[] = [];
  let rest = intPart;
  let big = 0;
  while (rest > 0 && big < bigUnits.length) {
    const section = rest % 10000;
    rest = Math.floor(rest / 10000);
    if (section !== 0) {
      let s = "";
      // order 仟佰拾个
      const vals = [
        Math.floor(section / 1000),
        Math.floor((section % 1000) / 100),
        Math.floor((section % 100) / 10),
        section % 10,
      ];
      for (let i = 0; i < 4; i++) {
        const v = vals[i] ?? 0;
        if (v === 0) {
          if (s && !s.endsWith("零") && i < 3) s += "零";
        } else {
          s += (digits[v] ?? "") + (intUnits[3 - i] ?? "");
        }
      }
      s = s.replace(/零+$/g, "");
      sections.unshift(s + (bigUnits[big] ?? ""));
    }
    big += 1;
  }
  let result =
    sections
      .join("")
      .replace(/零+/g, "零")
      .replace(/零([万亿])/g, "$1") + "元";
  if (frac === 0) result += "整";
  else {
    const jiao = Math.floor(frac / 10);
    const fen = frac % 10;
    if (jiao) result += (digits[jiao] ?? "") + (fracUnits[0] ?? "");
    if (fen) result += (digits[fen] ?? "") + (fracUnits[1] ?? "");
  }
  return result;
}

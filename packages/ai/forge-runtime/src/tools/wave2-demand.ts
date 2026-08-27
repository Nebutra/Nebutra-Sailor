/**
 * Wave-2 demand-matrix tools (docs §6.7) — Generator / Checker / Optimizer gaps.
 * Prefer pure, CF-edge-safe algorithms; no heavy native deps.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition, ForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

// ── Lorem Ipsum Generator (classic public-domain passage) ───────────────────

const LOREM_WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor " +
  "incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis " +
  "nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat " +
  "duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore " +
  "eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt " +
  "in culpa qui officia deserunt mollit anim id est laborum"
).split(" ");

function generateLorem(
  paragraphs: number,
  wordsPerParagraph: number,
  startWithLorem: boolean,
): string {
  const blocks: string[] = [];
  let cursor = 0;
  for (let p = 0; p < paragraphs; p++) {
    const words: string[] = [];
    for (let i = 0; i < wordsPerParagraph; i++) {
      if (p === 0 && i === 0 && startWithLorem) {
        words.push("Lorem");
        continue;
      }
      if (p === 0 && i === 1 && startWithLorem) {
        words.push("ipsum");
        continue;
      }
      const w = LOREM_WORDS[cursor % LOREM_WORDS.length] ?? "lorem";
      cursor += 1;
      words.push(i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w);
    }
    blocks.push(`${words.join(" ")}.`);
  }
  return blocks.join("\n\n");
}

export const loremIpsumTool = tool({
  id: "text/lorem-ipsum",
  slug: "lorem-ipsum",
  category: "text",
  title: { zh: "Lorem 生成器", en: "Lorem Ipsum Generator" },
  description: {
    zh: "生成占位假文（经典 Lorem 词库）",
    en: "Generate classic Lorem Ipsum placeholder text",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.lorem_ipsum",
  roots: ["generator"],
  engine: {
    name: "lorem-classic",
    upstream: "public-domain lorem word list",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "lorem ipsum生成器,假文生成,占位文本",
    en: "lorem ipsum generator, placeholder text generator online",
  },
  inputSchema: z.object({
    paragraphs: z.coerce.number().int().min(1).max(20).default(3),
    wordsPerParagraph: z.coerce.number().int().min(5).max(120).default(40),
    // UI select fields send "true"/"false" strings
    startWithLorem: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((v) => v === true || v === "true")
      .default(true),
  }),
  execute: (input: {
    paragraphs?: number;
    wordsPerParagraph?: number;
    startWithLorem?: boolean;
  }) => {
    const paragraphs = input.paragraphs ?? 3;
    const wordsPerParagraph = input.wordsPerParagraph ?? 40;
    const startWithLorem = input.startWithLorem !== false;
    return {
      text: generateLorem(paragraphs, wordsPerParagraph, startWithLorem),
      paragraphs,
      wordsPerParagraph,
    };
  },
});

// ── Email Checker ───────────────────────────────────────────────────────────

/** Practical email shape (not full RFC 5322 — matches common online validators). */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateEmail(email: string): { email: string; valid: boolean; reason?: string } {
  const trimmed = email.trim();
  if (!trimmed) return { email: trimmed, valid: false, reason: "empty" };
  if (trimmed.length > 254) return { email: trimmed, valid: false, reason: "too_long" };
  if (!EMAIL_RE.test(trimmed)) return { email: trimmed, valid: false, reason: "format" };
  const [local, domain] = trimmed.split("@");
  if (!local || local.length > 64) return { email: trimmed, valid: false, reason: "local_part" };
  if (!domain || !domain.includes(".")) return { email: trimmed, valid: false, reason: "domain" };
  return { email: trimmed, valid: true };
}

export const emailValidateTool = tool({
  id: "text/email-validate",
  slug: "email-validate",
  category: "text",
  title: { zh: "邮箱校验", en: "Email Validator" },
  description: {
    zh: "校验邮箱格式（支持批量，一行一个）",
    en: "Validate email format (batch, one per line)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.email_validate",
  roots: ["checker", "verifier"],
  engine: {
    name: "email-shape",
    upstream: "practical email regex (WHATWG-inspired)",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "邮箱验证,email校验,邮箱格式验证",
    en: "email validator, email checker online, validate email",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(50_000),
  }),
  execute: (input: { text: string }) => {
    const lines = input.text
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const results = lines.map(validateEmail);
    const validCount = results.filter((r) => r.valid).length;
    return {
      results,
      total: results.length,
      validCount,
      invalidCount: results.length - validCount,
    };
  },
});

// ── Credit card Luhn Checker ────────────────────────────────────────────────

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectBrand(digits: string): string {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(digits)) return "visa";
  if (/^5[1-5]\d{14}$/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01])\d{12}$/.test(digits))
    return "mastercard";
  if (/^3[47]\d{13}$/.test(digits)) return "amex";
  if (/^6(?:011|5\d{2})\d{12}$/.test(digits)) return "discover";
  if (/^3(?:0[0-5]|[68]\d)\d{11}$/.test(digits)) return "diners";
  if (/^(?:2131|1800|35\d{3})\d{11}$/.test(digits)) return "jcb";
  if (/^62\d{14,17}$/.test(digits)) return "unionpay";
  return "unknown";
}

export const creditCardLuhnTool = tool({
  id: "finance/credit-card-luhn",
  slug: "credit-card-luhn",
  category: "life",
  title: { zh: "银行卡 Luhn 校验", en: "Credit Card Luhn Checker" },
  description: {
    zh: "Luhn 算法校验卡号格式（不联网、不存储）",
    en: "Luhn algorithm check for card numbers (offline, never stored)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.finance.credit_card_luhn",
  roots: ["checker", "verifier"],
  engine: {
    name: "luhn",
    upstream: "ISO/IEC 7812 Luhn algorithm",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "银行卡校验,luhn算法,信用卡验证",
    en: "credit card validator, luhn check online, card number checker",
  },
  inputSchema: z.object({
    number: z.string().min(1).max(40),
  }),
  execute: (input: { number: string }) => {
    const digits = input.number.replace(/[\s-]/g, "");
    if (!/^\d{12,19}$/.test(digits)) {
      return {
        valid: false,
        brand: "unknown" as const,
        length: digits.length,
        reason: "length_or_digits",
      };
    }
    const valid = luhnCheck(digits);
    const brand = detectBrand(digits);
    return {
      valid,
      brand,
      length: digits.length,
      masked: `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`,
      ...(valid ? {} : { reason: "luhn_failed" as const }),
    };
  },
});

// ── JSON Minify (SEO slug; same engine as json-format minify) ───────────────

export const jsonMinifyTool: ForgeToolDefinition<
  { text: string },
  { result: string; bytes: number }
> = {
  id: "data/json-minify",
  slug: "json-minify",
  category: "data",
  title: { zh: "JSON 压缩", en: "JSON Minifier" },
  description: {
    zh: "压缩 JSON 去除空白（JSON.parse/stringify）",
    en: "Minify JSON by stripping whitespace via JSON.parse/stringify",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.json_minify",
  roots: ["optimizer", "formatter"],
  engine: {
    name: "JSON.parse",
    upstream: "ECMA-262 JSON",
    version: "runtime",
  },
  seoKeywords: {
    zh: "json压缩,json minify,json去空白",
    en: "json minifier, minify json online, compress json",
  },
  inputSchema: z.object({ text: z.string() }),
  execute: (input) => {
    try {
      const parsed: unknown = JSON.parse(input.text);
      const result = JSON.stringify(parsed);
      return { result, bytes: result.length };
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
  unitCost: 0,
};

// ── CSS Minifier (CSSO — industry SOTA structural optimisations) ────────────

export const cssMinifyTool = tool({
  id: "dev/css-minify",
  slug: "css-minify",
  category: "dev",
  title: { zh: "CSS 压缩", en: "CSS Minifier" },
  description: {
    zh: "CSSO 结构优化压缩：合并规则、缩短选择器与声明",
    en: "CSSO structural minify — merge rules, shorten selectors and declarations",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.dev.css_minify",
  roots: ["optimizer"],
  engine: {
    name: "csso",
    upstream: "https://github.com/css/csso",
    version: "5.x",
  },
  seoKeywords: {
    zh: "css压缩,css minify在线,csso",
    en: "css minifier online, minify css, csso compress css",
  },
  inputSchema: z.object({
    text: z.string().max(500_000),
  }),
  execute: async (input: { text: string }) => {
    const { minify } = await import("csso");
    const out = minify(input.text, { restructure: true });
    const result = out.css;
    return {
      result,
      bytesIn: input.text.length,
      bytesOut: result.length,
      saved: Math.max(0, input.text.length - result.length),
      engine: "csso",
    };
  },
});

// ── Hash Comparator ─────────────────────────────────────────────────────────

export const hashCompareTool = tool({
  id: "hash/hash-compare",
  slug: "hash-compare",
  category: "hash",
  title: { zh: "哈希比对", en: "Hash Comparator" },
  description: {
    zh: "常量时间比对两个哈希/字符串是否一致",
    en: "Constant-time compare two hashes or secrets",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.hash.compare",
  roots: ["comparator", "checker"],
  engine: {
    name: "timing-safe-equal",
    upstream: "constant-time string compare",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "哈希对比,checksum比对",
    en: "hash compare, checksum compare online",
  },
  inputSchema: z.object({
    a: z.string().min(1).max(10_000),
    b: z.string().min(1).max(10_000),
    ignoreCase: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((v) => v === true || v === "true")
      .default(true),
  }),
  execute: (input: { a: string; b: string; ignoreCase?: boolean }) => {
    const ignoreCase = input.ignoreCase !== false;
    const left = ignoreCase ? input.a.trim().toLowerCase() : input.a;
    const right = ignoreCase ? input.b.trim().toLowerCase() : input.b;
    // Length leak is acceptable for UX; still avoid early char exit for equal-length.
    let equal = left.length === right.length;
    if (equal) {
      let diff = 0;
      for (let i = 0; i < left.length; i++) {
        diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
      }
      equal = diff === 0;
    }
    return {
      equal,
      lengthA: input.a.length,
      lengthB: input.b.length,
      ignoreCase,
    };
  },
});

export const wave2DemandTools: readonly AnyForgeToolDefinition[] = [
  loremIpsumTool,
  emailValidateTool,
  creditCardLuhnTool,
  jsonMinifyTool,
  cssMinifyTool,
  hashCompareTool,
];

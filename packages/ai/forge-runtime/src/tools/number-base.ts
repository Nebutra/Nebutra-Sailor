import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  value: z.string().min(1),
  fromBase: z.number().int().min(2).max(36).default(10),
  toBase: z.number().int().min(2).max(36).default(16),
});

export type NumberBaseInput = z.infer<typeof InputSchema>;

export interface NumberBaseOutput {
  readonly result: string;
  readonly fromBase: number;
  readonly toBase: number;
  readonly decimal: string;
}

function run(input: NumberBaseInput): NumberBaseOutput {
  const fromBase = input.fromBase ?? 10;
  const toBase = input.toBase ?? 16;
  const cleaned = input.value.trim().replace(/^0x/i, fromBase === 16 ? "" : "");
  const n = Number.parseInt(cleaned, fromBase);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    throw new Error(`Invalid number for base ${fromBase}`);
  }
  return {
    result: n.toString(toBase),
    fromBase,
    toBase,
    decimal: n.toString(10),
  };
}

export const numberBaseTool: ForgeToolDefinition<NumberBaseInput, NumberBaseOutput> = {
  id: "dev/number-base",
  slug: "number-base",
  category: "dev",
  title: { zh: "进制转换", en: "Number Base Converter" },
  description: {
    zh: "2–36 进制互转",
    en: "Convert integers between bases 2–36",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.number_base",
  engine: {
    name: "std-number",
    upstream: "ECMAScript parseInt / toString",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "进制转换在线,十六进制转换",
    en: "number base converter hex binary",
  },
  sotaStatus: "production",
  inputSchema: InputSchema,
  execute: run,
  unitCost: 0,
};

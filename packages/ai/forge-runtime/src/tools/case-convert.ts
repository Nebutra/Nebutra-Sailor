import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
  mode: z.enum(["upper", "lower", "title", "toggle"]).default("upper"),
});

export type CaseConvertInput = z.infer<typeof InputSchema>;

export interface CaseConvertOutput {
  readonly result: string;
  readonly mode: CaseConvertInput["mode"];
}

function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function toggleCase(text: string): string {
  return [...text]
    .map((ch) => {
      const upper = ch.toUpperCase();
      const lower = ch.toLowerCase();
      if (ch === upper && ch !== lower) return lower;
      if (ch === lower && ch !== upper) return upper;
      return ch;
    })
    .join("");
}

function runCaseConvert(input: CaseConvertInput): CaseConvertOutput {
  const mode = input.mode ?? "upper";
  let result: string;
  switch (mode) {
    case "upper":
      result = input.text.toUpperCase();
      break;
    case "lower":
      result = input.text.toLowerCase();
      break;
    case "title":
      result = titleCase(input.text);
      break;
    case "toggle":
      result = toggleCase(input.text);
      break;
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown mode: ${_exhaustive}`);
    }
  }
  return { result, mode };
}

export const caseConvertTool: ForgeToolDefinition<CaseConvertInput, CaseConvertOutput> = {
  id: "text/case-convert",
  slug: "case-convert",
  category: "text",
  title: { zh: "大小写转换", en: "Case Converter" },
  description: {
    zh: "大写、小写、标题、切换大小写",
    en: "Upper, lower, title, and toggle case",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.case_convert",
  engine: {
    name: "text-utils",
    upstream: "nebutra pure TS",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "大小写转换在线",
    en: "case converter online",
  },
  inputSchema: InputSchema,
  execute: runCaseConvert,
  unitCost: 0,
};

import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string().max(2_000_000),
  mode: z.enum(["format", "minify", "validate"]).default("format"),
  indent: z.number().int().min(0).max(8).default(2),
  /** Stable key order for objects (recursive). Useful for diffs. */
  sortKeys: z.boolean().default(false),
});

export type JsonFormatInput = z.infer<typeof InputSchema>;

export interface JsonFormatOutput {
  readonly result: string;
  readonly mode: "format" | "minify" | "validate";
  readonly valid: true;
  readonly engine: string;
  readonly charsIn: number;
  readonly charsOut: number;
  readonly sortKeys: boolean;
}

function positionFromOffset(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const max = Math.min(offset, text.length);
  for (let i = 0; i < max; i++) {
    if (text[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

/** Recursively sort object keys for stable stringify. */
export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortJsonKeys(obj[key]);
    }
    return out;
  }
  return value;
}

function runJsonFormat(input: JsonFormatInput): JsonFormatOutput {
  const mode = input.mode ?? "format";
  const indent = input.indent ?? 2;
  const sortKeys = input.sortKeys === true;
  try {
    let parsed: unknown = JSON.parse(input.text);
    if (sortKeys) parsed = sortJsonKeys(parsed);
    let result: string;
    if (mode === "validate") {
      // Re-emit with same mode defaults as format for a usable payload.
      result = JSON.stringify(parsed, null, indent);
    } else if (mode === "minify") {
      result = JSON.stringify(parsed);
    } else {
      result = JSON.stringify(parsed, null, indent);
    }
    return {
      result,
      mode,
      valid: true,
      engine: "JSON.parse/stringify",
      charsIn: input.text.length,
      charsOut: result.length,
      sortKeys,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const match = message.match(/position\s+(\d+)/i);
    if (match?.[1]) {
      const offset = Number(match[1]);
      const { line, column } = positionFromOffset(input.text, offset);
      throw new Error(`${message} (line ${line}, column ${column})`);
    }
    throw err instanceof Error ? err : new Error(message);
  }
}

export const jsonFormatTool: ForgeToolDefinition<JsonFormatInput, JsonFormatOutput> = {
  id: "data/json-format",
  slug: "json-format",
  category: "data",
  title: { zh: "JSON 格式化", en: "JSON Formatter" },
  description: {
    zh: "ECMAScript JSON 引擎校验/美化/压缩，错误带行列；可选键排序",
    en: "Validate, pretty-print, or minify via JSON.parse with line/column errors; optional sortKeys",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.data.json_format",
  engine: {
    name: "JSON.parse",
    upstream: "ECMA-262 JSON",
    version: "runtime",
  },
  roots: ["formatter", "optimizer", "checker"],
  seoKeywords: {
    zh: "json格式化,json美化,json压缩,json formatter",
    en: "json formatter, json beautifier, json minifier online",
  },
  // Engine is language SOTA; dedicated human UX + Agent parity ship in apps/forge.
  inputSchema: InputSchema,
  execute: runJsonFormat,
  unitCost: 0,
};

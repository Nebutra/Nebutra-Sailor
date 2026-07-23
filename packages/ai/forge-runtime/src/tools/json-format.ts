import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
  mode: z.enum(["format", "minify"]).default("format"),
  indent: z.number().int().min(0).max(8).default(2),
});

export type JsonFormatInput = z.infer<typeof InputSchema>;

export interface JsonFormatOutput {
  readonly result: string;
  readonly mode: "format" | "minify";
  readonly valid: true;
  readonly engine: string;
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

function runJsonFormat(input: JsonFormatInput): JsonFormatOutput {
  const mode = input.mode ?? "format";
  const indent = input.indent ?? 2;
  try {
    const parsed: unknown = JSON.parse(input.text);
    const result =
      mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
    return {
      result,
      mode,
      valid: true,
      engine: "JSON.parse/stringify",
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
    zh: "ECMAScript JSON 引擎校验/美化/压缩，错误带行列",
    en: "Validate, pretty-print, or minify via JSON.parse with line/column errors",
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
  seoKeywords: {
    zh: "json格式化,json美化在线",
    en: "json formatter beautify online",
  },
  // Engine is language SOTA; dedicated human UX + Agent parity ship in apps/forge.
  sotaStatus: "production",
  inputSchema: InputSchema,
  execute: runJsonFormat,
  unitCost: 0,
};

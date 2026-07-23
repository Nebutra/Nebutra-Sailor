import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
});

export type RemoveBlankLinesInput = z.infer<typeof InputSchema>;

export interface RemoveBlankLinesOutput {
  readonly result: string;
  readonly removedLines: number;
}

function run(input: RemoveBlankLinesInput): RemoveBlankLinesOutput {
  const lines = input.text.split(/\r\n|\r|\n/);
  const kept = lines.filter((line) => line.trim().length > 0);
  return {
    result: kept.join("\n"),
    removedLines: lines.length - kept.length,
  };
}

export const removeBlankLinesTool: ForgeToolDefinition<
  RemoveBlankLinesInput,
  RemoveBlankLinesOutput
> = {
  id: "text/remove-blank-lines",
  slug: "remove-blank-lines",
  category: "text",
  title: { zh: "删除空行", en: "Remove Blank Lines" },
  description: {
    zh: "去掉文本中的空白行",
    en: "Strip empty lines from text",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.remove_blank_lines",
  engine: {
    name: "text-utils",
    upstream: "nebutra pure TS",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "删除空行在线",
    en: "remove blank lines online",
  },
  sotaStatus: "production",
  inputSchema: InputSchema,
  execute: run,
  unitCost: 0,
};

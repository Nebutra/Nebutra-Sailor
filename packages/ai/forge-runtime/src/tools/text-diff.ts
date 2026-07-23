import { createTwoFilesPatch, diffLines } from "diff";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  left: z.string(),
  right: z.string(),
  context: z.number().int().min(0).max(20).default(3),
});

export type TextDiffInput = z.infer<typeof InputSchema>;

export interface TextDiffOutput {
  readonly patch: string;
  readonly addedLines: number;
  readonly removedLines: number;
  readonly engine: string;
}

export const textDiffTool: ForgeToolDefinition<TextDiffInput, TextDiffOutput> = {
  id: "text/diff",
  slug: "text-diff",
  category: "text",
  title: { zh: "文本对比", en: "Text Diff" },
  description: {
    zh: "基于 diff 库的行级对比与 unified patch",
    en: "Line-level diff and unified patch via the diff package",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.diff",
  engine: {
    name: "diff",
    upstream: "https://github.com/kpdecker/jsdiff",
    version: "7.x",
  },
  seoKeywords: { zh: "文本对比,在线diff", en: "text diff online" },
  sotaStatus: "production",
  inputSchema: InputSchema,
  execute: (input) => {
    const context = input.context ?? 3;
    const parts = diffLines(input.left, input.right);
    let addedLines = 0;
    let removedLines = 0;
    for (const p of parts) {
      const n = p.count ?? p.value.split("\n").length - 1;
      if (p.added) addedLines += n;
      if (p.removed) removedLines += n;
    }
    const patch = createTwoFilesPatch("left", "right", input.left, input.right, "", "", {
      context,
    });
    return {
      patch,
      addedLines,
      removedLines,
      engine: "diff",
    };
  },
  unitCost: 0,
};

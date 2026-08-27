import { getEncoding, type TiktokenEncoding } from "js-tiktoken";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
  // o200k = current OpenAI GPT-5 / o-series / 4o-class tokenizer (models.dev era)
  encoding: z.enum(["o200k_base", "cl100k_base", "p50k_base", "r50k_base"]).default("o200k_base"),
});

export type TokenCountInput = z.infer<typeof InputSchema>;

export interface TokenCountOutput {
  readonly tokens: number;
  readonly encoding: string;
  readonly engine: string;
}

export const tokenCountTool: ForgeToolDefinition<TokenCountInput, TokenCountOutput> = {
  id: "llm/token-count",
  slug: "token-count",
  category: "llm",
  title: { zh: "Token 计数", en: "Token Counter" },
  description: {
    zh: "js-tiktoken 精确计数（对接 Router 费用估算）",
    en: "Exact token counts via js-tiktoken",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.llm.token_count",
  engine: {
    name: "js-tiktoken",
    upstream: "https://github.com/dqbd/tiktoken",
    version: "1.x",
  },
  seoKeywords: { zh: "token计数,tiktoken在线", en: "tiktoken counter online" },
  inputSchema: InputSchema,
  execute: (input) => {
    const encoding = (input.encoding ?? "o200k_base") as TiktokenEncoding;
    const enc = getEncoding(encoding);
    const tokens = enc.encode(input.text).length;
    return {
      tokens,
      encoding,
      engine: "js-tiktoken",
    };
  },
  unitCost: 0,
};

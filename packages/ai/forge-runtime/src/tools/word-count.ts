import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
});

export type WordCountInput = z.infer<typeof InputSchema>;

export interface WordCountOutput {
  readonly characters: number;
  readonly charactersNoSpaces: number;
  readonly words: number;
  readonly lines: number;
  readonly paragraphs: number;
  readonly cjkCharacters: number;
  readonly engine: string;
}

/**
 * Prefer Intl.Segmenter (Unicode SOTA) when available; fallback to latin+CJK rules.
 */
export function countText(text: string): WordCountOutput {
  const characters = [...text].length;
  const charactersNoSpaces = [...text.replace(/\s/g, "")].length;
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  const paragraphs =
    text.trim().length === 0 ? 0 : text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const cjkCharacters = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/gu) ?? []).length;

  let words: number;
  let engine: string;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    let count = 0;
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike || /[\u3400-\u9fff]/.test(segment)) count += 1;
    }
    words = count;
    engine = "Intl.Segmenter";
  } else {
    const latinWords = (text.match(/[A-Za-z0-9]+(?:['\u2019][A-Za-z0-9]+)*/g) ?? []).length;
    words = latinWords + cjkCharacters;
    engine = "latin+cjk-fallback";
  }

  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    paragraphs,
    cjkCharacters,
    engine,
  };
}

export const wordCountTool: ForgeToolDefinition<WordCountInput, WordCountOutput> = {
  id: "text/word-count",
  slug: "word-count",
  category: "text",
  title: { zh: "字数统计", en: "Word Counter" },
  description: {
    zh: "中英混排字数（Intl.Segmenter）",
    en: "CJK-aware word count via Intl.Segmenter",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.word_count",
  engine: {
    name: "Intl.Segmenter",
    upstream: "ECMA-402 Segmenter",
    version: "runtime",
  },
  seoKeywords: {
    zh: "在线字数统计,字符统计",
    en: "word counter online,character count",
  },
  // Segmenter path + dedicated live UX in apps/forge; Agent invoke shares API.
  sotaStatus: "production",
  inputSchema: InputSchema,
  execute: (input) => countText(input.text),
  unitCost: 0,
};

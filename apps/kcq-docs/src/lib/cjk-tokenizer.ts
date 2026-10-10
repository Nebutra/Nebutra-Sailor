import type { Tokenizer } from "@orama/orama";

/**
 * Orama has no Chinese tokenizer (and `create({ language: "zh" })` throws), so the zh index and
 * the client that loads it share this one: `Intl.Segmenter` word segments, plus each Han character
 * of a multi-character word so one-character queries still match. Adapted from
 * apps/sailor-docs/src/lib/cjk-tokenizer.ts.
 */
const CJK = /[㐀-鿿豈-﫿]/;

export function createCjkTokenizer(): Tokenizer {
  const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
  function tokenize(raw: unknown): string[] {
    if (typeof raw !== "string") return [String(raw)];
    const tokens = new Set<string>();
    for (const { segment, isWordLike } of segmenter.segment(raw.toLowerCase())) {
      const word = segment.trim();
      if (!word || isWordLike === false) continue;
      tokens.add(word);
      if (CJK.test(word) && word.length > 1) for (const char of word) tokens.add(char);
    }
    return [...tokens];
  }
  return { language: "cjk", normalizationCache: new Map(), tokenize };
}

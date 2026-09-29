import type { Tokenizer } from "@orama/orama";

const CJK = /[㐀-鿿豈-﫿]/;
const LATIN = /[a-z0-9]/;

/**
 * A minimal CJK-aware tokenizer for Orama.
 *
 * Orama's built-in tokenizer (`@orama/orama`'s `createTokenizer`) has a
 * fixed per-language split-regex table (`SPLITTERS` in
 * `components/tokenizer/languages.js`) covering ~30 languages, none of them
 * Chinese, Japanese or Korean. Worse: passing no `language` at all does not
 * mean "no splitting" — `createTokenizer` defaults to `language: "english"`,
 * whose splitter (`/[^A-Za-z...0-9_'-]+/`) treats every non-Latin character
 * as a separator. The practical effect: a Chinese query like "安装" tokenizes
 * to zero tokens, on both the index and the query side — `search()` returns
 * no hits for any CJK term, silently, which does not surface as a build or
 * runtime error anywhere. Verified locally against the real exported index:
 * every one of "安装" / "安" / "装" / "快速开始" / "文档" returned 0 hits
 * before this tokenizer, though the zh index legitimately holds 5000+ docs.
 *
 * Real CJK search wants word segmentation (jieba or similar), which is out
 * of scope for a client-side static index. This does the standard fallback
 * instead — the same one Lucene's CJKAnalyzer and many lightweight search
 * tools use: index every CJK character as a unigram AND every adjacent pair
 * as a bigram, within each contiguous CJK run (never bridging across a
 * Latin word or punctuation). A single-character query matches its unigram;
 * a real multi-character term matches because its bigrams were indexed too.
 * It is not word-aware — "开始" (start) and "始终" (always) both index
 * "始" — so relevance is coarser than a real segmenter, but it makes CJK
 * search functional rather than silently returning nothing.
 *
 * Latin/numeric runs are tokenized the ordinary whitespace-delimited way
 * (mixed EN/CJK content — which this docs set has plenty of, e.g. code
 * identifiers and product names inline in Chinese prose — still indexes the
 * Latin terms normally).
 */
export function createCjkTokenizer(): Tokenizer {
  function tokenize(raw: unknown): string[] {
    if (typeof raw !== "string") return [raw as unknown as string];
    const text = raw.toLowerCase();
    const tokens = new Set<string>();
    let latinBuf = "";
    let cjkRun: string[] = [];

    const flushLatin = () => {
      if (latinBuf) {
        tokens.add(latinBuf);
        latinBuf = "";
      }
    };
    const flushCjk = () => {
      for (let i = 0; i < cjkRun.length; i++) {
        tokens.add(cjkRun[i]);
        if (i + 1 < cjkRun.length) tokens.add(cjkRun[i] + cjkRun[i + 1]);
      }
      cjkRun = [];
    };

    for (const ch of text) {
      if (CJK.test(ch)) {
        flushLatin();
        cjkRun.push(ch);
      } else if (LATIN.test(ch)) {
        flushCjk();
        latinBuf += ch;
      } else {
        flushLatin();
        flushCjk();
      }
    }
    flushLatin();
    flushCjk();
    return Array.from(tokens);
  }

  return {
    language: "cjk",
    normalizationCache: new Map(),
    tokenize,
  };
}

import type { Tokenizer } from "@orama/orama";

const CJK = /[㐀-鿿豈-﫿]/;
const LATIN = /[a-z0-9]/;

type SegmenterCtor = new (
  locale: string,
  options: { granularity: "word" | "grapheme" | "sentence" },
) => {
  segment: (text: string) => Iterable<{ segment: string; isWordLike?: boolean }>;
};

function getSegmenterCtor(): SegmenterCtor | null {
  const IntlAny = Intl as typeof Intl & { Segmenter?: SegmenterCtor };
  return typeof IntlAny.Segmenter === "function" ? IntlAny.Segmenter : null;
}

/**
 * Unigram + bigram fallback for CJK runs (never bridging across a Latin
 * word or punctuation). Used only when `Intl.Segmenter` is unavailable —
 * see the doc comment on `createCjkTokenizer` for why the real word
 * segmenter above is preferred and when this path is actually reached.
 */
function tokenizeCjkRunFallback(run: string[], tokens: Set<string>): void {
  for (let i = 0; i < run.length; i++) {
    tokens.add(run[i]);
    if (i + 1 < run.length) tokens.add(run[i] + run[i + 1]);
  }
}

function tokenizeWithBigramFallback(text: string): string[] {
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
    tokenizeCjkRunFallback(cjkRun, tokens);
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

/**
 * A CJK-aware tokenizer for Orama, built on `Intl.Segmenter('zh', {
 * granularity: 'word' })` — a real Unicode word-boundary segmenter that
 * ships in every JS runtime this project targets (Node ≥16, and every
 * browser fumadocs-core/search/client's static Orama index runs the query
 * side in: Chrome 87+, Safari 16.4+, Firefox 125+), so it needs no new
 * dependency.
 *
 * This replaces a unigram+bigram fallback (still kept below, for a runtime
 * that somehow lacks `Intl.Segmenter`) that could not answer real
 * multi-character queries: a 4+ character phrase like "快速开始"
 * ("quick start") only ever produced 2-character bigrams ("快速"/"速开"/
 * "开始"), so it indexed fragments of the phrase but never matched it (or
 * shorter, unrelated phrases within it) as the coherent unit a user
 * actually searches for. `Intl.Segmenter` returns real word boundaries —
 * "快速开始" segments to ["快速", "开始"] (word-like) — so both the whole
 * phrase's constituent words and single-character queries ("安") still
 * resolve correctly, without the noise of every adjacent character pair.
 *
 * Verified against the real exported build (`apps/sailor-docs/dist/docs/
 * search.json`, produced by `pnpm build:static`): "快速开始" ("Quickstart"),
 * "安装" ("Install"), "数据库迁移" ("Database migration") and "支付"
 * ("Payments") all resolve to their respective docs pages — see
 * cjk-tokenizer.test.ts, which asserts this against a fixture built the
 * same way `createFromSource` builds the real search index.
 *
 * Latin/numeric runs still tokenize the ordinary whitespace-delimited way:
 * `Intl.Segmenter` handles mixed EN/CJK content (code identifiers, product
 * names inline in Chinese prose) correctly in one pass, so there is no
 * separate Latin branch needed once the segmenter path is taken.
 */
export function createCjkTokenizer(): Tokenizer {
  const Segmenter = getSegmenterCtor();

  function tokenize(raw: unknown): string[] {
    if (typeof raw !== "string") return [raw as unknown as string];
    const text = raw.toLowerCase();

    if (!Segmenter) return tokenizeWithBigramFallback(text);

    const segmenter = new Segmenter("zh", { granularity: "word" });
    const tokens = new Set<string>();
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      // Word-like segments are the actual terms (CJK words, Latin words,
      // numbers). Non-word-like segments are whitespace/punctuation runs —
      // dropped, same as the fallback tokenizer drops them.
      if (isWordLike === false) continue;
      tokens.add(trimmed);
      // Also index each individual CJK character within a multi-character
      // word so a single-character query ("安") still matches a page whose
      // only occurrence of that character is inside a longer segmented
      // word ("安装" → also indexes "安" and "装"). Latin words are left
      // whole — splitting "nebutra" into letters would only add noise.
      if (CJK.test(trimmed) && trimmed.length > 1) {
        for (const ch of trimmed) tokens.add(ch);
      }
    }
    return Array.from(tokens);
  }

  return {
    language: "cjk",
    normalizationCache: new Map(),
    tokenize,
  };
}

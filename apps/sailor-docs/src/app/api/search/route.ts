import { createFromSource } from "fumadocs-core/search/server";
import { createCjkTokenizer } from "@/lib/cjk-tokenizer";
import { source } from "@/lib/source";

/**
 * Static search index, not a search API.
 *
 * The route used to be `createSearchAPI("advanced", {...}).GET`, which
 * builds the Orama index once per cold start and then answers each request
 * by running the actual query server-side (`?query=...`) — a genuinely
 * per-request computation with unbounded input, which `output: "export"`
 * cannot prerender to one static file. `createFromSource(source)` builds the
 * same Orama index (it detects `source._i18n` and buckets it per language,
 * matching the previous flat `source.getPages()` list this replaces) but
 * exposes `.export()`: the whole index, serialized, unfiltered. That's
 * static — the same JSON for every request — so `next build` renders it once
 * to a real file. The `RootProvider` in `src/app/[lang]/layout.tsx` fetches
 * this file once client-side (`type: "static"`) and runs Orama queries in
 * the browser against it: fumadocs-core's documented pattern for a
 * server-less deployment (fumadocs-core/search/client's `oramaStaticClient`).
 */
const server = createFromSource(source, {
  // Orama's built-in tokenizer only covers a fixed language list (see
  // @orama/orama's `SPLITTERS`) and has no Chinese entry — worse, omitting
  // `language` entirely does not mean "don't split": `createTokenizer`
  // defaults to `language: "english"`, whose split regex treats every
  // non-Latin character as a separator, so Chinese text produces zero
  // tokens on both the index and the query side. Verified: every one of
  // "安装" / "安" / "装" / "快速开始" / "文档" returned 0 hits against the
  // exported zh index before this override, despite the zh index correctly
  // holding 5000+ docs. `createCjkTokenizer()` is a plain custom
  // `Tokenizer` (character unigrams + bigrams within CJK runs — see its
  // doc comment) that makes CJK terms searchable without a real word
  // segmenter.
  localeMap: {
    zh: { tokenizer: createCjkTokenizer() },
  },
});

export const dynamic = "force-static";

export async function GET() {
  return Response.json(await server.export());
}

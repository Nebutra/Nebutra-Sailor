import { logger } from "@nebutra/logger";
import { DOMAINS } from "../../config/env.js";

/**
 * Retrieval source for the docs assistant: the docs bundle's own exported
 * `llms-full.txt` (apps/sailor-docs/src/app/llms-full.txt/route.ts) — the
 * whole docs corpus concatenated as Markdown, built statically and served at
 * `${DOMAINS.docs}/llms-full.txt`.
 *
 * Why this over the alternatives:
 *  - Bundling the docs corpus into the gateway build (a second copy of the
 *    content) would drift from the deployed docs the moment either side
 *    redeployed alone, and couples an unrelated deploy (gateway) to docs
 *    content changes.
 *  - The exported search index (search.json) is Orama's binary/serialized
 *    index shape, meant for the client-side Orama query engine, not for
 *    grepping passages out of — reusing it here would mean depsending on
 *    Orama's internal format from the gateway for no benefit over the plain
 *    Markdown export.
 *  - Fetching `llms-full.txt` over HTTP from the SAME public origin real
 *    users read reuses a file that already exists for LLM consumption
 *    (llms.txt convention), needs no new build step, and always reflects
 *    whatever is actually live.
 *
 * Cached in-memory with a TTL so a burst of chat requests doesn't refetch a
 * multi-hundred-KB file per request; a cold cache costs one extra fetch on
 * the first request after the TTL expires or a process cold-starts.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

interface Passage {
  heading: string;
  body: string;
}

let cache: { passages: Passage[]; fetchedAt: number } | null = null;
let inFlight: Promise<Passage[]> | null = null;

/** Split llms-full.txt into passages on Markdown ATX headings (# / ##). */
function splitIntoPassages(text: string): Passage[] {
  const lines = text.split("\n");
  const passages: Passage[] = [];
  let heading = "";
  let body: string[] = [];

  const flush = () => {
    const joined = body.join("\n").trim();
    if (joined) passages.push({ heading, body: joined });
    body = [];
  };

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.*)/.exec(line);
    if (match) {
      flush();
      heading = (match[2] ?? "").trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return passages;
}

async function fetchPassages(): Promise<Passage[]> {
  const url = `${DOMAINS.docs}/llms-full.txt`;
  const res = await fetch(url, { headers: { accept: "text/plain, text/markdown" } });
  if (!res.ok) {
    throw new Error(`docs context fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  const text = await res.text();
  return splitIntoPassages(text);
}

async function getPassages(): Promise<Passage[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.passages;
  if (inFlight) return inFlight;

  inFlight = fetchPassages()
    .then((passages) => {
      cache = { passages, fetchedAt: Date.now() };
      return passages;
    })
    .catch((error) => {
      logger.warn("docs assistant: failed to fetch retrieval context", { error });
      // Serve a stale cache rather than nothing if we have one.
      if (cache) return cache.passages;
      return [];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "how",
  "to",
  "of",
  "and",
  "in",
  "for",
  "on",
  "what",
  "do",
  "i",
  "can",
  "does",
]);

function termsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9㐀-鿿]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Naive term-overlap scoring — deliberately not a real embedding search.
 * The docs corpus is a few hundred KB, so a linear scan per request is cheap,
 * and it needs no vector store, no embedding calls (extra cost + latency per
 * message) and no extra infrastructure. Good enough to hand the model the
 * right 3-5 passages for a docs question; not a general-purpose search
 * engine (the docs site's own Orama search already is one, for a human).
 */
export async function retrieveContext(query: string, topK = 5): Promise<string> {
  const passages = await getPassages();
  if (passages.length === 0) return "";

  const queryTerms = new Set(termsOf(query));
  if (queryTerms.size === 0) return "";

  const scored = passages
    .map((p) => {
      const bodyTerms = termsOf(`${p.heading} ${p.body}`);
      let score = 0;
      for (const t of bodyTerms) if (queryTerms.has(t)) score += 1;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ p }) => `### ${p.heading}\n${p.body.slice(0, 1500)}`).join("\n\n---\n\n");
}

/** Test-only: reset the in-memory cache between test cases. */
export function _resetDocsContextCache(): void {
  cache = null;
  inFlight = null;
}

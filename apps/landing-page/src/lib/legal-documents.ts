/**
 * Legal-document fetcher abstraction for the landing-page app.
 *
 * The landing-page is a separate Next.js app from `/web` and does not have
 * direct DB access. We expose a small `getLegalDocument(slug, locale, fetcher?)`
 * function so:
 *   1. Pages call `getLegalDocument(slug, locale)` and stay decoupled.
 *   2. The default fetcher hits `/api/legal/[slug]` (a route exposed by /web).
 *   3. Tests inject a mock fetcher.
 *
 * All failures (network, parse, 404, schema mismatch) collapse to `null` so
 * the page can render its own "not found" UI without crashing.
 */

import { cacheLife } from "next/cache";
import { z } from "zod";

const LEGAL_DOCUMENT_TYPES = [
  "PRIVACY_POLICY",
  "TERMS_OF_SERVICE",
  "COOKIE_POLICY",
  "REFUND_POLICY",
  "DPA",
  "ACCEPTABLE_USE",
  "OTHER",
] as const;

const legalDocumentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  type: z.enum(LEGAL_DOCUMENT_TYPES),
  locale: z.string(),
  version: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  /** Full markdown / plain-text body. */
  content: z.string(),
  effectiveAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean(),
  isRequired: z.boolean(),
});

export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export type LegalDocumentFetcher = (slug: string, locale: string) => Promise<unknown | null>;

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_LEGAL_API_BASE ?? "";

/**
 * Default fetcher: GET /api/legal/[slug]?locale=... and parse JSON.
 *
 * Short-circuits to `null` when `NEXT_PUBLIC_LEGAL_API_BASE` is unset — this
 * happens at build time (the /web API isn't reachable from the
 * landing-page's prerender sandbox) and would otherwise stall Next.js 16's
 * `"use cache"` filling phase until it hits `USE_CACHE_TIMEOUT`. Pages
 * gracefully render their `notFound()` fallback in that case.
 */
export const defaultLegalDocumentFetcher: LegalDocumentFetcher = async (slug, locale) => {
  if (!DEFAULT_API_BASE) return null;

  const url = `${DEFAULT_API_BASE}/api/legal/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    // Cache lightly — legal docs change rarely; tag invalidation in /web.
    next: { revalidate: 300, tags: [`legal:${slug}`] } as RequestInit["next"],
  } as RequestInit);
  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as unknown;
};

function safeParse(payload: unknown): LegalDocument | null {
  if (payload === null || payload === undefined) return null;
  const parsed = legalDocumentSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/**
 * Fetch the active LegalDocument for `slug` + `locale`.
 *
 * Production callers omit the third argument and go through the
 * `'use cache'` path so Next.js 16 cacheComponents-aware pages can render
 * inside `generateMetadata` / Suspense boundaries without tripping the
 * "uncached data outside <Suspense>" prerender guard. Tests pass an explicit
 * fetcher and skip the cache (the `'use cache'` directive rejects function-
 * typed arguments as cache keys, so the test path must bypass it).
 *
 * Notes on the cache contract:
 *  - `cacheLife("hours")` matches the legacy `next.revalidate: 300` window;
 *    the underlying fetcher is left tag-aware so /web's webhook tag-invalidate
 *    still works once we plumb it through.
 *  - `notFound()` is intentionally NOT called here — `'use cache'` rejects
 *    non-deterministic navigation side effects. Callers receive `null` and
 *    decide whether to render a 404 themselves.
 *
 * If the locale-specific document is missing, falls back to English once.
 * All exceptions and validation failures resolve to `null`.
 */
export async function getLegalDocument(
  slug: string,
  locale: string,
  fetcher?: LegalDocumentFetcher,
): Promise<LegalDocument | null> {
  if (!fetcher) {
    return cachedGetLegalDocument(slug, locale);
  }
  return resolveLegalDocument(slug, locale, fetcher);
}

async function cachedGetLegalDocument(slug: string, locale: string): Promise<LegalDocument | null> {
  "use cache";
  cacheLife("hours");
  return resolveLegalDocument(slug, locale, defaultLegalDocumentFetcher);
}

async function resolveLegalDocument(
  slug: string,
  locale: string,
  fetcher: LegalDocumentFetcher,
): Promise<LegalDocument | null> {
  const direct = await tryFetch(slug, locale, fetcher);
  if (direct) return direct;

  if (locale !== "en") {
    const fallback = await tryFetch(slug, "en", fetcher);
    if (fallback) return fallback;
  }
  return null;
}

async function tryFetch(
  slug: string,
  locale: string,
  fetcher: LegalDocumentFetcher,
): Promise<LegalDocument | null> {
  try {
    const payload = await fetcher(slug, locale);
    return safeParse(payload);
  } catch {
    return null;
  }
}

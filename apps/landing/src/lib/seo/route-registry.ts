import { CONTENT_PRIMARY_ROUTE_LOCALES } from "@nebutra/i18n/locales";
import { routing } from "@/i18n/routing";

/**
 * Single SEO route SSOT for the landing origin.
 *
 * "Which locales may this path appear in" is answered exactly once, here, and
 * read by both the sitemap (`src/app/sitemap.ts`) and the metadata builder
 * (`src/lib/seo/metadata.ts`). No call site decides indexability by itself.
 *
 * Two localization scopes:
 *   `ui`      — the UI shell is translated into every route locale AND the body
 *               copy lives in the message catalogs, so the page is a genuine
 *               per-locale document: all route locales, self-canonical,
 *               indexable, full hreflang cluster.
 *   `content` — body copy is authored only in the content-primary locales
 *               (`CONTENT_PRIMARY_ROUTE_LOCALES`, derived in @nebutra/i18n).
 *               Other locales would be translated chrome around identical
 *               English/Chinese bodies, i.e. near-duplicates, so they are kept
 *               out of the sitemap and marked noindex,follow with a canonical
 *               pointing at the content-primary URL.
 */
export type Localization = "ui" | "content";

export type SeoRouteEntry = {
  /** Route path without locale prefix. May end in a single `/*` wildcard. */
  readonly pattern: `/${string}`;
  readonly changeFrequency: "always" | "daily" | "weekly" | "monthly" | "yearly";
  readonly priority: number;
  readonly localization: Localization;
  readonly sitelinkCandidate?: {
    readonly label: string;
  };
};

export const SEO_ROUTE_REGISTRY: ReadonlyArray<SeoRouteEntry> = [
  // ── UI-scoped marketing / legal pages ───────────────────────────
  {
    pattern: "/",
    changeFrequency: "weekly",
    priority: 1.0,
    localization: "ui",
    sitelinkCandidate: { label: "Nebutra Agent OS" },
  },
  {
    pattern: "/features",
    changeFrequency: "weekly",
    priority: 0.9,
    localization: "ui",
    sitelinkCandidate: { label: "Features" },
  },
  {
    pattern: "/refer",
    changeFrequency: "weekly",
    priority: 0.8,
    localization: "ui",
    sitelinkCandidate: { label: "Founder Referral" },
  },
  {
    pattern: "/solutions",
    changeFrequency: "weekly",
    priority: 0.9,
    localization: "ui",
    sitelinkCandidate: { label: "Solutions" },
  },
  {
    pattern: "/pricing",
    changeFrequency: "weekly",
    priority: 0.9,
    localization: "ui",
    sitelinkCandidate: { label: "Pricing" },
  },
  {
    pattern: "/get-license",
    changeFrequency: "weekly",
    priority: 0.9,
    localization: "ui",
    sitelinkCandidate: { label: "Get License" },
  },
  {
    pattern: "/licensing",
    changeFrequency: "monthly",
    priority: 0.8,
    localization: "ui",
    sitelinkCandidate: { label: "Licensing" },
  },
  {
    pattern: "/ai/models",
    changeFrequency: "monthly",
    priority: 0.8,
    localization: "ui",
    sitelinkCandidate: { label: "AI Models" },
  },
  {
    pattern: "/blog",
    changeFrequency: "weekly",
    priority: 0.8,
    localization: "ui",
    sitelinkCandidate: { label: "Blog" },
  },
  {
    pattern: "/news",
    changeFrequency: "weekly",
    priority: 0.8,
    localization: "ui",
    sitelinkCandidate: { label: "Newsroom" },
  },
  {
    pattern: "/changelog",
    changeFrequency: "weekly",
    priority: 0.7,
    localization: "ui",
    sitelinkCandidate: { label: "Changelog" },
  },
  {
    pattern: "/roadmap",
    changeFrequency: "monthly",
    priority: 0.6,
    localization: "ui",
    sitelinkCandidate: { label: "Roadmap" },
  },
  {
    pattern: "/status",
    changeFrequency: "always",
    priority: 0.6,
    localization: "ui",
    sitelinkCandidate: { label: "Status" },
  },
  {
    pattern: "/security",
    changeFrequency: "monthly",
    priority: 0.7,
    localization: "ui",
    sitelinkCandidate: { label: "Security" },
  },
  {
    pattern: "/about",
    changeFrequency: "monthly",
    priority: 0.7,
    localization: "ui",
    sitelinkCandidate: { label: "About Nebutra" },
  },
  { pattern: "/careers", changeFrequency: "weekly", priority: 0.6, localization: "ui" },
  { pattern: "/ideas", changeFrequency: "weekly", priority: 0.6, localization: "ui" },
  { pattern: "/about/products", changeFrequency: "monthly", priority: 0.6, localization: "ui" },
  {
    pattern: "/contact",
    changeFrequency: "monthly",
    priority: 0.5,
    localization: "ui",
    sitelinkCandidate: { label: "Contact" },
  },
  { pattern: "/faq", changeFrequency: "monthly", priority: 0.5, localization: "ui" },
  { pattern: "/privacy", changeFrequency: "monthly", priority: 0.2, localization: "ui" },
  { pattern: "/terms", changeFrequency: "monthly", priority: 0.2, localization: "ui" },
  { pattern: "/cookies", changeFrequency: "monthly", priority: 0.2, localization: "ui" },
  { pattern: "/refund", changeFrequency: "monthly", priority: 0.2, localization: "ui" },
  { pattern: "/dpa", changeFrequency: "monthly", priority: 0.2, localization: "ui" },

  // ── Content-scoped dynamic families ─────────────────────────────
  { pattern: "/blog/*", changeFrequency: "monthly", priority: 0.7, localization: "content" },
  { pattern: "/changelog/*", changeFrequency: "monthly", priority: 0.5, localization: "content" },
  { pattern: "/features/*", changeFrequency: "monthly", priority: 0.6, localization: "content" },
  { pattern: "/solutions/*", changeFrequency: "monthly", priority: 0.65, localization: "content" },
] as const;

const WILDCARD_SUFFIX = "/*";

function isWildcard(entry: SeoRouteEntry): boolean {
  return entry.pattern.endsWith(WILDCARD_SUFFIX);
}

/** Wildcard prefix including the trailing slash: "/blog/*" → "/blog/". */
function wildcardPrefix(entry: SeoRouteEntry): string {
  return entry.pattern.slice(0, -1);
}

const EXACT_ENTRIES: ReadonlyMap<string, SeoRouteEntry> = new Map(
  SEO_ROUTE_REGISTRY.filter((entry) => !isWildcard(entry)).map((entry) => [entry.pattern, entry]),
);

// Longest prefix first so "/solutions/global-vc/*" would win over "/solutions/*".
const WILDCARD_ENTRIES: ReadonlyArray<SeoRouteEntry> = SEO_ROUTE_REGISTRY.filter(isWildcard)
  .slice()
  .sort((a, b) => b.pattern.length - a.pattern.length);

function normalize(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

/** Exact match first, then the longest matching wildcard family. */
export function resolveSeoRoute(path: string): SeoRouteEntry | undefined {
  const normalized = normalize(path);
  const exact = EXACT_ENTRIES.get(normalized);
  if (exact) return exact;
  return WILDCARD_ENTRIES.find((entry) => normalized.startsWith(wildcardPrefix(entry)));
}

/**
 * Localization scope for a path.
 *
 * Throws outside production so a newly added route that nobody registered is
 * loud in dev and test instead of silently over-indexed; in production it
 * degrades to the index-narrowing default (`content`).
 */
export function localizationFor(path: string): Localization {
  const entry = resolveSeoRoute(path);
  if (entry) return entry.localization;

  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      `[seo] Unregistered route "${path}". Add it to apps/landing/src/lib/seo/route-registry.ts ` +
        `with a localization scope ("ui" for catalog-translated pages, "content" for ` +
        `bilingual-body pages) before shipping it.`,
    );
  }
  return "content";
}

/**
 * Locales a path may legitimately be published in — the single mechanism that
 * makes 32-locale duplicate content unrepresentable.
 */
export function localesForPath(path: string): readonly string[] {
  return localizationFor(path) === "ui" ? routing.locales : CONTENT_PRIMARY_ROUTE_LOCALES;
}

/**
 * Feature-detail pages worth indexing. The `package` kind is auto-flattened
 * from a file tree, so it produces hundreds of thin near-identical pages; only
 * `group` and `capability` entries carry hand-written signal.
 *
 * Kept structural (a predicate on `kind`) so the prerender path and the sitemap
 * share one definition instead of two copies of the same filter.
 */
export function isHighSignalFeatureEntry(entry: { readonly kind: string }): boolean {
  return entry.kind !== "package";
}

import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import { getLegalDocument } from "@/lib/legal-documents";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LegalDocumentContent } from "./_components/legal-document-content";

// Known canonical legal documents — enumerated so Next.js 16 cacheComponents
// can build a finite prerender set. Slugs outside this list render on-demand
// at request time and are cached via PPR — no dynamicParams = true needed
// (on-demand is the default; the export is forbidden under cacheComponents).
const KNOWN_LEGAL_SLUGS = [
  "privacy-policy",
  "terms-of-service",
  "cookie-policy",
  "refund-policy",
  "dpa",
  "acceptable-use",
] as const;

/**
 * Params outside generateStaticParams render on demand as a blocking route
 * rather than streaming behind a <Suspense> fallback: a streamed page reaches a
 * reader without JavaScript as its fallback (scripts/verify-landing-ssr.mjs).
 */
export const instant = false;

export function generateStaticParams() {
  return prerenderDefaultLocale([...KNOWN_LEGAL_SLUGS], (slug) => ({ slug }));
}

interface LegalSlugPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

/**
 * Dynamic legal-document viewer.
 *
 * Routes like `/legal/privacy-policy`, `/legal/terms-of-service` resolve their
 * content from the LegalDocument table (via `/api/legal/[slug]` exposed by
 * `/web`). The body renders in place — not behind <Suspense> — so a reader
 * without JavaScript gets the document (scripts/verify-landing-ssr.mjs).
 */

// `'use cache'` cannot live directly on `generateMetadata` because Next.js
// passes `params: Promise<...>` to it, and Promises are not valid cache keys.
// The directive must sit on a helper whose inputs are fully serializable
// (strings here), so the framework can deterministically compute a cache key.
async function buildLegalMetadata(slug: string, lang: string): Promise<Metadata> {
  "use cache";
  cacheLife("hours");
  const doc = await getLegalDocument(slug, lang);
  if (!doc) return {};
  // `none` scope: a DB-backed duplicate of /privacy, /terms, /cookies, /refund
  // and /dpa, so it is served but never canonical.
  return buildPageMetadata({
    title: doc.title,
    description: doc.summary ?? doc.title,
    path: `/legal/${slug}`,
    locale: lang,
  });
}

export async function generateMetadata({ params }: LegalSlugPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildLegalMetadata(slug, lang);
}

export default function LegalSlugPage({ params }: LegalSlugPageProps) {
  return <LegalDocumentLoader params={params} />;
}

async function LegalDocumentLoader({ params }: LegalSlugPageProps) {
  const { lang, slug } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();
  setRequestLocale(lang as Locale);
  return <LegalDocumentContent slug={slug} lang={lang} />;
}

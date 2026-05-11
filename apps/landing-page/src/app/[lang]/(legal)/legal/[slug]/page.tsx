import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { type Locale, routing } from "@/i18n/routing";
import { getLegalDocument } from "@/lib/legal-documents";
import { LegalDocumentContent, LegalDocumentSkeleton } from "./_components/legal-document-content";

// Known canonical legal documents — enumerated so Next.js 16 cacheComponents
// can build a finite prerender set instead of trying (and failing) to render
// the literal `[slug]` placeholder route. Slugs that fall outside this list
// render dynamically at request time via dynamicParams = true.
const KNOWN_LEGAL_SLUGS = [
  "privacy-policy",
  "terms-of-service",
  "cookie-policy",
  "refund-policy",
  "dpa",
  "acceptable-use",
] as const;

export function generateStaticParams() {
  return routing.locales.flatMap((lang) => KNOWN_LEGAL_SLUGS.map((slug) => ({ lang, slug })));
}

interface LegalSlugPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

/**
 * Dynamic legal-document viewer.
 *
 * Routes like `/legal/privacy-policy`, `/legal/terms-of-service` resolve their
 * content from the LegalDocument table (via `/api/legal/[slug]` exposed by
 * `/web`). The body fetch lives in a child wrapped in <Suspense> so the page
 * shell can stream first under Next.js 16 cacheComponents.
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
  return {
    title: doc.title,
    description: doc.summary ?? undefined,
  };
}

export async function generateMetadata({ params }: LegalSlugPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildLegalMetadata(slug, lang);
}

export default async function LegalSlugPage({ params }: LegalSlugPageProps) {
  const { lang, slug } = await params;
  setRequestLocale(lang as Locale);

  return (
    <Suspense fallback={<LegalDocumentSkeleton />}>
      <LegalDocumentContent slug={slug} lang={lang} />
    </Suspense>
  );
}

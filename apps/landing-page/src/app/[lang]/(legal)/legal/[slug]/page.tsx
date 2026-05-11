import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { getLegalDocument } from "@/lib/legal-documents";
import { LegalDocumentContent, LegalDocumentSkeleton } from "./_components/legal-document-content";

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
export async function generateMetadata({ params }: LegalSlugPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const doc = await getLegalDocument(slug, lang);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.summary ?? undefined,
  };
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

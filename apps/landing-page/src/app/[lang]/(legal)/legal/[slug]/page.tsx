import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/i18n/routing";
import { getLegalDocument } from "@/lib/legal-documents";

interface LegalSlugPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

/**
 * Dynamic legal-document viewer.
 *
 * Routes like `/legal/privacy-policy`, `/legal/terms-of-service` resolve their
 * content from the LegalDocument table (via `/api/legal/[slug]` exposed by
 * `/web`). Body is rendered as a `<pre>` block with whitespace-preserve so the
 * landing-page does not need a markdown dependency for v1; once a renderer is
 * adopted, only the body block changes.
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

  // Next.js 16: a server component that performs uncached data fetching MUST
  // be wrapped in <Suspense> so the page shell can stream while the data
  // loads. getLegalDocument hits an upstream /api/legal/[slug] endpoint —
  // even though that fetch has `next.revalidate: 300`, the strict-mode
  // checker requires the boundary because the slug is fully dynamic.
  return (
    <Suspense fallback={<LegalDocumentSkeleton />}>
      <LegalDocumentContent slug={slug} lang={lang} />
    </Suspense>
  );
}

/**
 * Exported for test access — wraps the async fetch + render inside Suspense.
 * Production code should consume this via `<LegalSlugPage />` only.
 */
export async function LegalDocumentContent({ slug, lang }: { slug: string; lang: string }) {
  const doc = await getLegalDocument(slug, lang);
  if (!doc) {
    notFound();
  }

  const effectiveDate = formatDate(doc.effectiveAt);

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>{doc.title}</h1>
      <p className="text-sm text-[var(--neutral-10)]">
        Version {doc.version} · Effective {effectiveDate}
      </p>
      {doc.summary ? <p className="lead">{doc.summary}</p> : null}
      <hr />
      {/* MVP: render body as preformatted text. Swap for markdown renderer
          once a dependency choice (react-markdown / shiki / etc.) is made. */}
      <pre className="whitespace-pre-wrap break-words rounded-[var(--radius-md)] bg-[var(--neutral-2)] p-4 text-sm font-sans text-[var(--neutral-12)] dark:text-white">
        {doc.content}
      </pre>
    </article>
  );
}

function LegalDocumentSkeleton() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none" aria-busy="true">
      <div className="h-9 w-2/3 animate-pulse rounded bg-[var(--neutral-3)]" />
      <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-[var(--neutral-3)]" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[var(--neutral-3)]" />
      <hr />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-[var(--neutral-3)]" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-[var(--neutral-3)]" />
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

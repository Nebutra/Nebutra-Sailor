import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

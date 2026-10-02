import { format } from "date-fns";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLegalDocument } from "@/lib/legal-documents";

/**
 * Renders the document body once the upstream fetch resolves.
 *
 * Lives in a `_components/` directory so the parent `page.tsx` can keep
 * its strict Next.js 16 export shape (only default + generateMetadata).
 * Tests import this directly to bypass the page-level Suspense boundary.
 *
 * Cache contract: `getLegalDocument(slug, lang)` (no third arg) routes
 * through the `"use cache"` path defined in `@/lib/legal-documents`, so this
 * component itself stays a plain async server component — needed because
 * `notFound()` (a non-deterministic navigation side effect) is forbidden
 * inside `"use cache"` functions.
 */
export async function LegalDocumentContent({ slug, lang }: { slug: string; lang: string }) {
  const doc = await getLegalDocument(slug, lang);
  if (!doc) {
    notFound();
  }

  const effectiveDate = formatDate(doc.effectiveAt);
  const t = await getTranslations({ locale: lang, namespace: "legalPages.document" });

  return (
    <article className="prose max-w-none">
      <h1>{doc.title}</h1>
      <p className="text-sm text-muted-foreground">
        {t("versionLabel", { version: doc.version, date: effectiveDate })}
      </p>
      {doc.summary ? <p className="lead">{doc.summary}</p> : null}
      <hr />
      {/* MVP: render body as preformatted text. Swap for markdown renderer
          once a dependency choice (react-markdown / shiki / etc.) is made. */}
      <pre className="whitespace-pre-wrap break-words rounded-[var(--radius-md)] bg-muted p-4 text-sm font-sans text-foreground">
        {doc.content}
      </pre>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "yyyy-MM-dd");
}

import { notFound } from "next/navigation";
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

export function LegalDocumentSkeleton() {
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

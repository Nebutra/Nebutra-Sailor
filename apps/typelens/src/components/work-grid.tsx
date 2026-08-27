import Link from "next/link";
import { WorkCard } from "@/components/work-card";
import type { Specimen, Typeface, Work } from "@/lib/catalog";
import { TL_CONTAINER } from "@/lib/layout";

export const WORKS_PAGE_SIZE = 48;

/**
 * FiU-style dense photo wall — no marketing tiles.
 */
export function WorkGrid({
  works,
  specimens,
  typefaces,
  total,
  page = 1,
  pageSize = WORKS_PAGE_SIZE,
  basePath = "/works",
  query = {},
}: {
  works: readonly Work[];
  specimens: readonly Specimen[];
  typefaces: readonly Typeface[];
  total?: number;
  page?: number;
  pageSize?: number;
  basePath?: string;
  query?: Record<string, string | undefined>;
}) {
  const byWork = new Map(specimens.map((s) => [s.workId, s]));
  const totalCount = total ?? works.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <section className={`${TL_CONTAINER} py-8 md:py-10`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tl-kicker mb-1.5">Collection</p>
          <p className="text-[0.95rem] font-medium tracking-tight text-[var(--tl-ink)]">
            {totalCount.toLocaleString()} works
            {totalPages > 1 ? (
              <span className="font-normal text-[var(--tl-muted)]">
                {" "}
                · {safePage}/{totalPages}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {works.map((work) => {
          const specimen = byWork.get(work.id);
          const props = specimen ? { work, typefaces, specimen } : { work, typefaces };
          return <WorkCard key={work.id} {...props} />;
        })}
      </div>

      {works.length === 0 ? (
        <p className="py-24 text-center text-[var(--tl-muted)]">No works match these filters.</p>
      ) : null}

      {totalPages > 1 ? (
        <nav
          className="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-[var(--tl-line)] pt-8"
          aria-label="Pagination"
        >
          {safePage > 1 ? (
            <Link
              href={hrefFor(safePage - 1)}
              scroll
              className="border border-[var(--tl-line-strong)] px-4 py-2 text-sm font-semibold text-[var(--tl-ink)] no-underline hover:bg-[var(--tl-surface)]"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-sm text-[var(--tl-muted)]">
            {safePage} / {totalPages}
          </span>
          {safePage < totalPages ? (
            <Link
              href={hrefFor(safePage + 1)}
              scroll
              className="border border-[var(--tl-line-strong)] px-4 py-2 text-sm font-semibold text-[var(--tl-ink)] no-underline hover:bg-[var(--tl-surface)]"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}

import { WorkCard } from "@/components/work-card";
import type { Specimen, Typeface, Work } from "@/lib/catalog";
import { TL_CONTAINER } from "@/lib/layout";

/**
 * Gallery density: fewer columns, larger cards, museum spacing.
 */
export function WorkGrid({
  works,
  specimens,
  typefaces,
}: {
  works: readonly Work[];
  specimens: readonly Specimen[];
  typefaces: readonly Typeface[];
}) {
  const byWork = new Map(specimens.map((s) => [s.workId, s]));

  return (
    <section className={`${TL_CONTAINER} py-10 md:py-14`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--tl-line-soft)] pb-5">
        <div>
          <p className="tl-kicker mb-2">Collection</p>
          <p className="text-lg font-medium tracking-tight text-[var(--tl-ink)] md:text-xl">
            {works.length} published works
            <span className="font-normal text-[var(--tl-muted)]"> · free commercial</span>
          </p>
        </div>
        <p className="text-sm text-[var(--tl-muted)]">
          Sort · <span className="text-[var(--tl-ink)]">Published</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {works.map((work) => {
          const specimen = byWork.get(work.id);
          const props = specimen ? { work, typefaces, specimen } : { work, typefaces };
          return <WorkCard key={work.id} {...props} />;
        })}
      </div>

      {works.length === 0 ? (
        <p className="py-24 text-center text-lg text-[var(--tl-muted)]">
          No works match these filters.
        </p>
      ) : null}
    </section>
  );
}

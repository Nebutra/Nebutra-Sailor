import { WorkCard } from "@/components/work-card";
import type { Specimen, Typeface, Work } from "@/lib/catalog";

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
    <section className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
        <p>
          Show: <span className="font-semibold text-neutral-900">All ({works.length})</span> / Free
          commercial
        </p>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {works.map((work) => {
          const specimen = byWork.get(work.id);
          const props = specimen ? { work, typefaces, specimen } : { work, typefaces };
          return <WorkCard key={work.id} {...props} />;
        })}
      </div>
      {works.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No works match these filters.</p>
      ) : null}
    </section>
  );
}

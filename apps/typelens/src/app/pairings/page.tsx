import Link from "next/link";
import { extractSpecimen, getWork, listSpecimens } from "@/lib/catalog";
export const metadata = { title: "Pairings" };
export default function PairingsPage() {
  const specimens = listSpecimens();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Pairings</h1>
      <p className="mt-3 max-w-2xl text-neutral-600">Verified font combinations from real works.</p>
      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {specimens.map((s) => {
          const work = getWork(s.workId);
          if (!work) return null;
          const pack = extractSpecimen(s.id);
          const display = pack.pairing.display;
          const body = pack.pairing.body ?? pack.pairing.headline;
          return (
            <Link
              key={s.id}
              href={`/works/${work.slug}`}
              className="flex flex-col border border-neutral-200 no-underline hover:shadow-md"
            >
              <div className="flex min-h-[180px] flex-col justify-between gap-4 bg-neutral-50 p-6">
                {display ? (
                  <p
                    className="text-3xl leading-none font-semibold"
                    style={{ fontFamily: display.cssStack }}
                  >
                    {display.family}
                  </p>
                ) : null}
                {body ? (
                  <p className="text-base" style={{ fontFamily: body.cssStack }}>
                    with {body.family}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1 border-t border-neutral-200 p-4">
                <p className="font-semibold text-neutral-900">{work.title}</p>
                <p className="text-sm text-neutral-500">{s.pairing.strategy}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

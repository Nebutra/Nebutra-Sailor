import Link from "next/link";
import { getWork, searchSpecimens } from "@/lib/catalog";

type SearchParams = Promise<{ q?: string }>;
export const metadata = { title: "Search" };
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const hits = query ? searchSpecimens({ query }) : [];
  return (
    <div
      data-tl-section
      className="mx-auto w-full max-w-[800px] px-5 py-12 sm:px-6 md:px-8 md:py-16 will-change-transform"
    >
      <h1 className="text-4xl font-bold tracking-tight">Search</h1>
      <form action="/search" method="get" className="mt-6 flex gap-2">
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Typeface, mood, medium…"
          data-allow-native
          className="min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>
      {query ? (
        <p className="mt-4 text-sm text-neutral-500">
          {hits.length} results for “{query}”
        </p>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">Try “控制台”, “poster”, or “Fraunces”.</p>
      )}
      <ul className="mt-8 space-y-4">
        {hits.map((s) => {
          const work = getWork(s.workId);
          if (!work) return null;
          return (
            <li key={s.id} className="border-b border-neutral-100 pb-4">
              <Link href={`/works/${work.slug}`} className="text-xl font-semibold hover:underline">
                {work.title}
              </Link>
              <p className="mt-1 text-sm text-neutral-600">{s.summary}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

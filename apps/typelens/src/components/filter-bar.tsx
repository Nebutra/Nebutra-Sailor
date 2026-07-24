import Link from "next/link";

const media = [
  { value: "", label: "All media" },
  { value: "poster", label: "Posters" },
  { value: "website", label: "Web" },
  { value: "app-ui", label: "Software / Apps" },
] as const;

const moods = [
  { value: "", label: "All moods" },
  { value: "calm", label: "Calm" },
  { value: "tech", label: "Tech" },
  { value: "expressive", label: "Expressive" },
  { value: "cultural", label: "Cultural" },
] as const;

export function FilterBar({ medium, mood }: { medium?: string; mood?: string }) {
  return (
    <div className="border-b-2 border-neutral-900 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2 text-sm font-semibold md:px-8">
        <details className="relative">
          <summary className="cursor-pointer list-none">Medium ▾</summary>
          <div className="absolute z-20 mt-1 min-w-[10rem] border border-neutral-200 bg-white py-1 shadow-sm">
            {media.map((m) => (
              <Link
                key={m.value || "all"}
                href={m.value ? `/works?medium=${m.value}` : "/works"}
                className="block px-3 py-1.5 no-underline hover:bg-neutral-50"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </details>
        <details className="relative">
          <summary className="cursor-pointer list-none">Mood ▾</summary>
          <div className="absolute z-20 mt-1 min-w-[10rem] border border-neutral-200 bg-white py-1 shadow-sm">
            {moods.map((m) => (
              <Link
                key={m.value || "all"}
                href={m.value ? `/works?mood=${m.value}` : "/works"}
                className="block px-3 py-1.5 no-underline hover:bg-neutral-50"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </details>
        <Link href="/typefaces" className="no-underline hover:underline">
          Typefaces ▾
        </Link>
        <Link href="/pairings" className="ml-auto text-neutral-600 no-underline hover:underline">
          Pairings gallery →
        </Link>
      </div>
    </div>
  );
}

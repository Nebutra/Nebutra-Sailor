import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

const media = [
  { value: "", label: "All media" },
  { value: "poster", label: "Posters" },
  { value: "website", label: "Web" },
  { value: "app-ui", label: "Software / Apps" },
  { value: "editorial", label: "Editorial" },
] as const;

const moods = [
  { value: "", label: "All moods" },
  { value: "calm", label: "Calm" },
  { value: "tech", label: "Tech" },
  { value: "expressive", label: "Expressive" },
  { value: "cultural", label: "Cultural" },
  { value: "energetic", label: "Energetic" },
] as const;

/**
 * Museum filter strip — thick rule, generous tracking, quiet controls.
 */
export function FilterBar(props: { medium?: string; mood?: string } = {}) {
  const medium = props.medium ?? "";
  const mood = props.mood ?? "";

  return (
    <div
      data-tl-filter
      className="sticky top-0 z-30 border-b-2 border-[var(--tl-ink)] bg-[var(--tl-paper)]/95 backdrop-blur-md will-change-transform"
    >
      <div
        className={`${TL_CONTAINER} flex flex-wrap items-center gap-x-10 gap-y-3 py-3.5 text-[0.8rem] font-semibold tracking-[0.12em] uppercase`}
      >
        <details className="relative">
          <summary className="cursor-pointer list-none select-none text-[var(--tl-ink)]">
            Medium{medium ? ` · ${medium}` : ""} ▾
          </summary>
          <div className="absolute top-full left-0 z-40 mt-2 min-w-[12rem] border border-[var(--tl-ink)] bg-white py-2 shadow-[0_16px_40px_-20px_rgb(0_0_0/40%)] normal-case tracking-normal">
            {media.map((m) => (
              <Link
                key={m.value || "all"}
                href={m.value ? `/works?medium=${m.value}` : "/works"}
                className={`block px-4 py-2.5 text-sm font-medium no-underline hover:bg-[var(--tl-paper-deep)] ${
                  medium === m.value ? "bg-[var(--tl-paper-deep)]" : ""
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary className="cursor-pointer list-none select-none text-[var(--tl-ink)]">
            Mood{mood ? ` · ${mood}` : ""} ▾
          </summary>
          <div className="absolute top-full left-0 z-40 mt-2 min-w-[12rem] border border-[var(--tl-ink)] bg-white py-2 shadow-[0_16px_40px_-20px_rgb(0_0_0/40%)] normal-case tracking-normal">
            {moods.map((m) => (
              <Link
                key={m.value || "all"}
                href={m.value ? `/works?mood=${m.value}` : "/works"}
                className={`block px-4 py-2.5 text-sm font-medium no-underline hover:bg-[var(--tl-paper-deep)] ${
                  mood === m.value ? "bg-[var(--tl-paper-deep)]" : ""
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </details>

        <Link
          href="/typefaces"
          className="text-[var(--tl-ink)] no-underline transition-opacity hover:opacity-50"
        >
          Typefaces ▾
        </Link>

        <Link
          href="/pairings"
          className="ml-auto tracking-[0.08em] text-[var(--tl-muted)] no-underline transition-colors hover:text-[var(--tl-ink)]"
        >
          Pairings gallery →
        </Link>
      </div>
    </div>
  );
}

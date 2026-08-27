import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

const media = [
  { value: "", label: "All media" },
  { value: "poster", label: "Posters" },
  { value: "website", label: "Web" },
  { value: "app-ui", label: "Software / Apps" },
  { value: "editorial", label: "Editorial" },
  { value: "packaging", label: "Packaging" },
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
 * Sticky filter — hairline, not a marketing strip.
 */
export function FilterBar(props: { medium?: string; mood?: string } = {}) {
  const medium = props.medium ?? "";
  const mood = props.mood ?? "";

  return (
    <div
      data-tl-filter
      className="sticky top-0 z-30 border-b border-[var(--tl-line)] bg-[var(--tl-paper)]/90 backdrop-blur-md will-change-transform"
    >
      <div
        className={`${TL_CONTAINER} flex flex-wrap items-center gap-x-7 gap-y-2 py-3 text-[0.75rem] font-medium tracking-[0.04em]`}
      >
        <details className="relative">
          <summary className="cursor-pointer list-none select-none text-[var(--tl-ink-soft)] transition-colors hover:text-[var(--tl-ink)]">
            Medium{medium ? ` · ${medium}` : ""}
            <span className="ml-1 opacity-40">▾</span>
          </summary>
          <div className="absolute top-full left-0 z-40 mt-2 min-w-[11rem] bg-[var(--tl-surface)] py-1.5 shadow-[var(--tl-shadow-sm)] ring-1 ring-[var(--tl-line)]">
            {media.map((m) => (
              <Link
                key={m.value || "all"}
                href={m.value ? `/works?medium=${m.value}` : "/works"}
                className={`block px-3.5 py-2 text-sm font-medium tracking-normal no-underline hover:bg-[var(--tl-paper-deep)] ${
                  medium === m.value
                    ? "bg-[var(--tl-paper-deep)] text-[var(--tl-ink)]"
                    : "text-[var(--tl-ink-soft)]"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary className="cursor-pointer list-none select-none text-[var(--tl-ink-soft)] transition-colors hover:text-[var(--tl-ink)]">
            Mood{mood ? ` · ${mood}` : ""}
            <span className="ml-1 opacity-40">▾</span>
          </summary>
          <div className="absolute top-full left-0 z-40 mt-2 min-w-[11rem] bg-[var(--tl-surface)] py-1.5 shadow-[var(--tl-shadow-sm)] ring-1 ring-[var(--tl-line)]">
            {moods.map((m) => (
              <Link
                key={m.value || "all"}
                href={m.value ? `/works?mood=${m.value}` : "/works"}
                className={`block px-3.5 py-2 text-sm font-medium tracking-normal no-underline hover:bg-[var(--tl-paper-deep)] ${
                  mood === m.value
                    ? "bg-[var(--tl-paper-deep)] text-[var(--tl-ink)]"
                    : "text-[var(--tl-ink-soft)]"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </details>

        <Link
          href="/typefaces"
          className="text-[var(--tl-ink-soft)] no-underline transition-colors hover:text-[var(--tl-ink)]"
        >
          Typefaces
        </Link>

        <Link
          href="/pairings"
          className="ml-auto text-[var(--tl-muted)] no-underline transition-colors hover:text-[var(--tl-ink)]"
        >
          Pairings →
        </Link>
      </div>
    </div>
  );
}

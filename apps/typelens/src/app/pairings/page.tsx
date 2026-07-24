import Link from "next/link";
import { extractSpecimen, getWork, listSpecimens } from "@/lib/catalog";
import { TL_CONTAINER } from "@/lib/layout";

export const metadata = { title: "Pairings" };

const STAGE = [
  "linear-gradient(155deg, #0a0a0a 0%, #222 55%, #f0ebe3 55%)",
  "linear-gradient(180deg, #f7f5f0 0%, #e4dfd4 100%)",
  "linear-gradient(135deg, #1c1917 0%, #44403c 100%)",
  "linear-gradient(160deg, #fafafa 40%, #d4d4d4 100%)",
  "linear-gradient(145deg, #171412 0%, #78716c 48%, #fafaf9 48%)",
  "linear-gradient(170deg, #0c0a09 0%, #292524 100%)",
] as const;

/**
 * Hero product surface — large pairing stages, not dense cards.
 */
export default function PairingsPage() {
  const specimens = listSpecimens();

  return (
    <div className={`${TL_CONTAINER} py-12 md:py-16`}>
      <header data-tl-section className="mb-12 max-w-3xl md:mb-16 will-change-transform">
        <p className="tl-kicker mb-4">Gallery</p>
        <h1 className="tl-display text-[clamp(2.75rem,6vw,4.5rem)] text-[var(--tl-ink)]">
          Pairings
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--tl-muted)] md:text-xl">
          Verified font combinations from real works — the moment designers browse and agents
          extract.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:gap-12">
        {specimens.map((s, i) => {
          const work = getWork(s.workId);
          if (!work) return null;
          const pack = extractSpecimen(s.id);
          const display = pack.pairing.display;
          const body = pack.pairing.body ?? pack.pairing.headline;
          const dark = i % 3 === 0 || i % 5 === 0 ? "#fafaf9" : "#0a0a0a";
          const bg = STAGE[i % STAGE.length];

          return (
            <Link
              key={s.id}
              href={`/works/${work.slug}`}
              data-tl-card
              className="tl-card group flex flex-col overflow-hidden border border-[var(--tl-ink)]/10 no-underline will-change-transform"
            >
              <div
                className="flex min-h-[280px] flex-col justify-between gap-8 p-8 md:min-h-[340px] md:p-10"
                style={{ background: bg, color: dark }}
              >
                <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase opacity-60">
                  {work.medium} · {pack.medium}
                </span>
                <div className="space-y-5">
                  {display ? (
                    <p
                      className="text-[clamp(2.25rem,4vw,3.25rem)] leading-[0.95] font-semibold tracking-[-0.03em]"
                      style={{ fontFamily: display.cssStack }}
                    >
                      {display.family}
                    </p>
                  ) : null}
                  {body ? (
                    <p
                      className="text-lg opacity-85 md:text-xl"
                      style={{ fontFamily: body.cssStack }}
                    >
                      with {body.family}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2 border-t border-[var(--tl-line-soft)] bg-white px-8 py-6">
                <p className="text-xl font-semibold tracking-tight text-[var(--tl-ink)]">
                  {work.title}
                </p>
                <p className="text-[0.95rem] leading-snug text-[var(--tl-muted)]">
                  {s.pairing.strategy}
                </p>
                <p className="pt-1 text-xs tracking-wide text-[var(--tl-muted)] uppercase">
                  {s.tags.slice(0, 4).join(" · ")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

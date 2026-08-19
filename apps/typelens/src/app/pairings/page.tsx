import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";
import { listPairingGroups } from "@/lib/pairings";

/** Catalog is immutable in the worker — static HTML avoids per-request full extract. */
export const dynamic = "force-static";

export const metadata = {
  title: "Pairings",
  description:
    "Font combinations — free-commercial systems. Works are evidence; the combination is the unit.",
};

/**
 * Pairings = font combinations first; works as evidence only.
 * Not a second works wall, not CSS cssStack mock stages.
 */
export default function PairingsPage() {
  const groups = listPairingGroups({ multiOnly: true, limit: 36 });

  return (
    <div className={`${TL_CONTAINER} py-12 md:py-16`}>
      <header className="mb-10 max-w-2xl pb-8 md:mb-12">
        <p className="tl-kicker mb-3">Systems</p>
        <h1 className="text-[clamp(2rem,4.2vw,3rem)] font-semibold tracking-[-0.03em] text-[var(--tl-ink)]">
          Pairings
        </h1>
        <p className="mt-4 max-w-xl text-[1.05rem] leading-[1.65] text-[var(--tl-muted)]">
          <strong className="font-semibold text-[var(--tl-ink)]">Font combinations</strong> are the
          product unit here — not individual works. Each card is a free-commercial system agents can
          extract.
        </p>
        <p className="mt-3 text-sm text-[var(--tl-muted)]">
          Works under each combination are evidence.{" "}
          <Link
            href="/works"
            className="font-medium text-[var(--tl-ink)] underline-offset-4 hover:underline"
          >
            Browse works
          </Link>
          {" · "}
          <Link
            href="/docs/agents"
            className="font-medium text-[var(--tl-ink)] underline-offset-4 hover:underline"
          >
            For agents
          </Link>
        </p>
        <p className="mt-2 text-sm text-[var(--tl-muted-soft)]">
          {groups.length.toLocaleString()} multi-face systems
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {groups.map((g) => {
          const title = g.faces.map((f) => f.family).join(" + ");
          return (
            <article
              key={g.key}
              data-tl-card
              className="overflow-hidden bg-[var(--tl-surface)] shadow-[var(--tl-shadow-sm)] ring-1 ring-[var(--tl-line)] will-change-transform"
            >
              <div className="grid gap-0 lg:grid-cols-12">
                {/* Combination first */}
                <div className="flex flex-col justify-between border-b border-[var(--tl-line)] p-6 md:p-8 lg:col-span-7 lg:border-r lg:border-b-0">
                  <div>
                    <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-[var(--tl-muted)] uppercase">
                      Combination · {g.faces.length} faces
                    </p>
                    <h2 className="mt-2.5 text-[clamp(1.25rem,2vw,1.65rem)] font-semibold tracking-[-0.025em] text-[var(--tl-ink)] text-balance">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--tl-muted)]">
                      {g.strategy}
                    </p>
                  </div>

                  <ul className="mt-7 space-y-3.5">
                    {g.faces.map((f) => (
                      <li key={f.typefaceId} className="flex items-center gap-4">
                        <Link
                          href={`/typefaces/${f.typefaceId}`}
                          className="min-w-0 flex-1 no-underline"
                        >
                          {f.sampleImageUrl ? (
                            // biome-ignore lint/a11y/useAltText: family adjacent
                            <img
                              src={f.sampleImageUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="h-8 w-auto max-w-full object-contain object-left sm:h-9"
                            />
                          ) : (
                            <span className="text-base font-semibold tracking-tight text-[var(--tl-ink)]">
                              {f.family}
                            </span>
                          )}
                        </Link>
                        <Link
                          href={`/typefaces/${f.typefaceId}`}
                          className="hidden shrink-0 text-sm text-[var(--tl-muted)] no-underline transition-colors hover:text-[var(--tl-ink)] sm:block"
                        >
                          {f.family}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex flex-wrap items-center gap-2.5">
                    <Link
                      href="/docs/agents"
                      className="inline-flex items-center border border-[var(--tl-ink)] bg-[var(--tl-ink)] px-4 py-2 text-sm font-semibold text-[var(--tl-surface)] no-underline hover:opacity-90"
                    >
                      Extract path →
                    </Link>
                    <span className="text-sm text-[var(--tl-muted)]">
                      Seen in {g.workCount} work{g.workCount === 1 ? "" : "s"}
                      {g.mediums.length ? ` · ${g.mediums.slice(0, 3).join(", ")}` : ""}
                    </span>
                  </div>
                </div>

                {/* Evidence: real work photos */}
                <div className="bg-[var(--tl-paper)]/60 p-5 md:p-6 lg:col-span-5">
                  <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-[var(--tl-muted)] uppercase">
                    Evidence in works
                  </p>
                  <p className="mt-1 text-xs text-[var(--tl-muted-soft)]">
                    Supporting scenes — not the pairing itself.
                  </p>
                  <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                    {g.works.map((w) => (
                      <li key={w.slug}>
                        <Link
                          href={`/works/${w.slug}`}
                          className="group block no-underline"
                          title={w.title}
                        >
                          <div className="aspect-[3/4] overflow-hidden bg-[var(--tl-paper-deep)] ring-1 ring-[var(--tl-line)]">
                            {w.cover ? (
                              // biome-ignore lint/a11y/useAltText: title attr
                              <img
                                src={w.cover}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-opacity group-hover:opacity-85"
                              />
                            ) : (
                              <div className="flex h-full items-end p-1.5 text-[0.6rem] text-[var(--tl-muted)]">
                                {w.medium}
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {g.tags.length > 0 ? (
                    <p className="mt-4 text-[0.68rem] tracking-wide text-[var(--tl-muted-soft)] uppercase">
                      {g.tags.slice(0, 5).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <p className="py-20 text-center text-[var(--tl-muted)]">
          No multi-face free-commercial combinations yet.
        </p>
      ) : null}
    </div>
  );
}

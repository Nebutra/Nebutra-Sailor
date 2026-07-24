import Link from "next/link";
import { listTypefaces } from "@/lib/catalog";
import { TL_CONTAINER } from "@/lib/layout";

export const metadata = { title: "Typefaces" };

export default function TypefacesPage() {
  const typefaces = listTypefaces();

  return (
    <div className={`${TL_CONTAINER} py-12 md:py-16`}>
      <header
        data-tl-section
        className="mb-12 max-w-3xl border-b border-[var(--tl-line-soft)] pb-10 will-change-transform md:mb-14"
      >
        <p className="tl-kicker mb-4">Index</p>
        <h1 className="tl-display text-[clamp(2.75rem,6vw,4.5rem)]">Typefaces</h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--tl-muted)] md:text-xl">
          Free commercial-use faces only. Each entry leads to works where the pairing context makes
          it sing.
        </p>
      </header>

      <ul className="divide-y divide-[var(--tl-line-soft)] border-y border-[var(--tl-ink)]">
        {typefaces.map((tf) => (
          <li
            key={tf.id}
            data-tl-card
            className="flex flex-col gap-4 py-8 will-change-transform sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:py-10"
          >
            <div className="min-w-0">
              <Link
                href={`/typefaces/${tf.id}`}
                className="block text-[clamp(1.75rem,3vw,2.5rem)] leading-none font-semibold tracking-[-0.03em] no-underline transition-opacity hover:opacity-55"
                style={{ fontFamily: tf.cssStack }}
              >
                {tf.family}
              </Link>
              <p className="mt-3 text-sm text-[var(--tl-muted)]">
                {tf.foundry}
                <span className="mx-2 opacity-40">·</span>
                {tf.category}
                <span className="mx-2 opacity-40">·</span>
                {tf.scripts.join(", ")}
              </p>
            </div>
            <span className="shrink-0 self-start border border-emerald-800/30 bg-emerald-50/80 px-3 py-1.5 text-[0.7rem] font-semibold tracking-[0.12em] text-emerald-950 uppercase sm:self-end">
              {tf.license.spdxOrLabel} · commercial
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

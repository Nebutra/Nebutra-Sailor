import Link from "next/link";
import type { Specimen, Typeface, Work } from "@/lib/catalog";

export type WorkCardProps = {
  work: Work;
  typefaces: readonly Typeface[];
  specimen?: Specimen;
};

function isImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && !/\.(js|css|svg)(\?|$)/i.test(url);
}

/** Cover photo vs FiU nameplate/sample PNG. */
function splitAssets(assets: string[]): { cover?: string; nameplates: string[] } {
  const good = assets.filter(isImageUrl);
  if (!good.length) return { nameplates: [] };
  const cover = good.find((u) => /use-media|thumb|upto-/i.test(u)) ?? good[0];
  const nameplates = good.filter(
    (u) => u !== cover && (/\/samples\/|\/renders\//i.test(u) || /\.png(\?|$)/i.test(u)),
  );
  const out: { cover?: string; nameplates: string[] } = {
    nameplates: nameplates.length
      ? nameplates.slice(0, 3)
      : good.filter((u) => u !== cover).slice(0, 3),
  };
  if (cover) out.cover = cover;
  return out;
}

/**
 * Real collection tile: photography + nameplate PNGs (not CSS mock stages).
 */
export function WorkCard({ work, typefaces, specimen }: WorkCardProps) {
  const byId = new Map(typefaces.map((t) => [t.id, t]));
  const faces =
    specimen?.typefaces
      .map((ref) => byId.get(ref.typefaceId))
      .filter((f): f is Typeface => Boolean(f)) ?? [];
  const seen = new Set<string>();
  const faceList: Typeface[] = [];
  for (const f of faces) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    faceList.push(f);
  }

  const { cover, nameplates } = splitAssets(work.imageAssets ?? []);

  // Prefer work nameplates; fall back to typeface sample URLs
  const plates =
    nameplates.length > 0
      ? nameplates
      : faceList
          .map((f) => f.sampleImageUrl)
          .filter((u): u is string => Boolean(u))
          .slice(0, 3);

  return (
    <article data-tl-card className="tl-card group flex flex-col gap-2.5 will-change-transform">
      <Link
        href={`/works/${work.slug}`}
        className="tl-stage relative block overflow-hidden ring-1 ring-[var(--tl-line)] no-underline"
      >
        {cover ? (
          // biome-ignore lint/a11y/useAltText: title on detail
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="aspect-[4/5] w-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.02] group-hover:opacity-95"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-end bg-gradient-to-br from-[var(--tl-paper-deep)] to-[var(--tl-line)] p-4">
            <span className="text-sm font-medium tracking-tight text-[var(--tl-muted)]">
              {work.title}
            </span>
          </div>
        )}
      </Link>

      <div className="flex min-h-[2.25rem] flex-col gap-1 px-0.5">
        {plates.length > 0 ? (
          plates.map((src, i) => {
            const face = faceList[i];
            const href = face ? `/typefaces/${face.id}` : `/works/${work.slug}`;
            return (
              <Link key={`${src}-${i}`} href={href} className="block no-underline">
                {/* biome-ignore lint/a11y/useAltText: decorative nameplate */}
                <img
                  src={src}
                  alt={face?.family ?? ""}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-6 w-auto max-w-full object-contain object-left opacity-85 transition-opacity hover:opacity-100 sm:h-7"
                />
              </Link>
            );
          })
        ) : faceList.length > 0 ? (
          faceList.slice(0, 3).map((face) => (
            <Link
              key={face.id}
              href={`/typefaces/${face.id}`}
              className="block text-[0.8125rem] leading-snug font-medium tracking-tight text-[var(--tl-ink-soft)] no-underline hover:text-[var(--tl-ink)]"
            >
              {face.family}
            </Link>
          ))
        ) : (
          <Link
            href={`/works/${work.slug}`}
            className="block text-[0.8125rem] font-medium tracking-tight text-[var(--tl-ink-soft)] no-underline hover:text-[var(--tl-ink)]"
          >
            {work.title}
          </Link>
        )}
      </div>
    </article>
  );
}

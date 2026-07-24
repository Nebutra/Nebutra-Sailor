import Link from "next/link";
import type { Specimen, Typeface, Work } from "@/lib/catalog";

export type WorkCardProps = {
  work: Work;
  typefaces: readonly Typeface[];
  specimen?: Specimen;
};

export function WorkCard({ work, typefaces, specimen }: WorkCardProps) {
  const byId = new Map(typefaces.map((t) => [t.id, t]));
  const faces =
    specimen?.typefaces.map((ref) => ({
      ref,
      face: byId.get(ref.typefaceId),
    })) ?? [];
  const primary = faces[0]?.face;
  const verified = specimen?.verifiedBy === "human" || specimen?.verifiedBy === "hybrid";

  return (
    <article className="flex flex-col gap-3">
      <Link
        href={`/works/${work.slug}`}
        className="relative block aspect-[4/5] overflow-hidden border border-neutral-200 no-underline"
      >
        <div
          className="flex h-full flex-col justify-between p-4"
          style={{
            background:
              work.medium === "poster"
                ? "linear-gradient(160deg, #111 0%, #333 55%, #f5f5f5 55%)"
                : "#fafafa",
            color: work.medium === "poster" ? "#fff" : "#111",
          }}
        >
          <div
            className="text-2xl leading-none font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: primary?.cssStack ?? "system-ui, sans-serif" }}
          >
            {work.titleZh ?? work.title}
          </div>
          <div className="space-y-1 text-xs opacity-80">
            <p className="uppercase tracking-wider">{work.medium}</p>
            {faces.slice(0, 2).map(({ face, ref }) =>
              face ? (
                <p key={`${ref.typefaceId}-${ref.role}`} style={{ fontFamily: face.cssStack }}>
                  {face.family} · {ref.role}
                </p>
              ) : null,
            )}
          </div>
        </div>
        {verified ? (
          <span className="absolute top-2 right-2 rotate-12 border border-current bg-white/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-neutral-900 uppercase">
            Verified
          </span>
        ) : null}
      </Link>
      <div className="space-y-1">
        <Link
          href={`/works/${work.slug}`}
          className="block text-lg leading-snug font-semibold text-neutral-900 no-underline hover:underline"
        >
          {work.title}
        </Link>
        <ul className="space-y-0.5 text-sm">
          {faces.slice(0, 3).map(({ face, ref }) =>
            face ? (
              <li key={`${ref.typefaceId}-${ref.role}`}>
                <Link
                  href={`/typefaces/${face.id}`}
                  className="text-neutral-800 underline-offset-2 hover:underline"
                >
                  {face.family}
                </Link>
                <span className="text-neutral-400"> · {ref.role}</span>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </article>
  );
}

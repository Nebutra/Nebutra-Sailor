import Link from "next/link";
import type { CSSProperties } from "react";
import type { Specimen, Typeface, Work } from "@/lib/catalog";

export type WorkCardProps = {
  work: Work;
  typefaces: readonly Typeface[];
  specimen?: Specimen;
};

/** Art-directed specimen stage per medium — larger, more cinematic. */
function stageStyle(medium: Work["medium"]): CSSProperties {
  switch (medium) {
    case "poster":
      return {
        background: "radial-gradient(120% 90% at 10% 0%, #2a2a2a 0%, #0a0a0a 55%, #111 100%)",
        color: "#f5f5f4",
      };
    case "website":
      return {
        background: "linear-gradient(165deg, #f7f6f3 0%, #ebe8e1 48%, #ddd8ce 100%)",
        color: "#0a0a0a",
      };
    case "app-ui":
      return {
        background: "linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)",
        color: "#0a0a0a",
      };
    case "editorial":
      return {
        background: "linear-gradient(145deg, #1a1814 0%, #3d3428 50%, #c4b8a5 50.2%, #e8e0d4 100%)",
        color: "#faf8f5",
      };
    default:
      return {
        background: "linear-gradient(160deg, #f5f5f5, #e8e8e8)",
        color: "#0a0a0a",
      };
  }
}

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
    <article data-tl-card className="tl-card group flex flex-col gap-4 will-change-transform">
      <Link
        href={`/works/${work.slug}`}
        className="tl-stage relative block aspect-[3/4] overflow-hidden border border-[var(--tl-ink)]/10 no-underline"
      >
        <div
          className="flex h-full flex-col justify-between p-6 md:p-7"
          style={stageStyle(work.medium)}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase opacity-70">
              {work.medium.replace("-", " ")}
            </span>
            {verified ? (
              <span className="border border-current/40 bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold tracking-[0.16em] uppercase backdrop-blur-sm">
                Verified
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            <div
              className="text-[clamp(1.75rem,2.4vw,2.35rem)] leading-[0.95] font-semibold tracking-[-0.03em]"
              style={{
                fontFamily: primary?.cssStack ?? "system-ui, sans-serif",
              }}
            >
              {work.titleZh ?? work.title}
            </div>
            <div className="space-y-1 border-t border-current/15 pt-3 text-[0.8rem] opacity-80">
              {faces.slice(0, 2).map(({ face, ref }) =>
                face ? (
                  <p key={`${ref.typefaceId}-${ref.role}`} style={{ fontFamily: face.cssStack }}>
                    <span className="tracking-wide opacity-60">{ref.role}</span>
                    {"  "}
                    {face.family}
                  </p>
                ) : null,
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-2 px-0.5">
        <Link
          href={`/works/${work.slug}`}
          className="block text-[1.15rem] leading-snug font-semibold tracking-[-0.02em] text-[var(--tl-ink)] no-underline transition-opacity group-hover:opacity-70"
        >
          {work.title}
        </Link>
        {work.titleZh ? <p className="text-sm text-[var(--tl-muted)]">{work.titleZh}</p> : null}
        <ul className="space-y-1 text-[0.9rem]">
          {faces.slice(0, 3).map(({ face, ref }) =>
            face ? (
              <li key={`${ref.typefaceId}-${ref.role}`}>
                <Link
                  href={`/typefaces/${face.id}`}
                  className="text-[var(--tl-ink-soft)] underline-offset-4 hover:underline"
                >
                  {face.family}
                </Link>
                <span className="text-[var(--tl-muted)]"> · {ref.role}</span>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </article>
  );
}

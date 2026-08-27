import Link from "next/link";
import { notFound } from "next/navigation";
import {
  extractSpecimen,
  getSpecimenForWork,
  getTypeface,
  getWork,
  mediumLabel,
} from "@/lib/catalog";
import { resolvedStack } from "@/lib/catalog-fonts.generated";
import { TL_CONTAINER } from "@/lib/layout";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  return { title: getWork(slug)?.title ?? "Work" };
}

export default async function WorkDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work || work.status !== "published") notFound();
  const specimen = getSpecimenForWork(work.id);
  const extract = specimen ? extractSpecimen(specimen.id) : null;

  return (
    <article data-tl-section className={`${TL_CONTAINER} py-12 md:py-16 will-change-transform`}>
      <div className="mx-auto max-w-[52rem]">
        <p className="tl-kicker mb-4">
          <Link href="/works" className="hover:text-[var(--tl-ink)]">
            Works
          </Link>
          <span className="mx-3 opacity-30">/</span>
          {mediumLabel(work.medium)}
        </p>

        <h1 className="tl-display text-[clamp(2.5rem,5.5vw,4rem)] text-[var(--tl-ink)]">
          {work.title}
        </h1>
        {work.titleZh ? (
          <p className="mt-4 text-xl text-[var(--tl-muted)] md:text-2xl">{work.titleZh}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {work.mood.map((m) => (
            <Link
              key={m}
              href={`/works?mood=${m}`}
              className="border border-[var(--tl-ink)]/20 px-3.5 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase no-underline transition-colors hover:border-[var(--tl-ink)] hover:bg-[var(--tl-ink)] hover:text-white"
            >
              {m}
            </Link>
          ))}
          {work.scripts.map((s) => (
            <span
              key={s}
              className="bg-[var(--tl-paper-deep)] px-3.5 py-1.5 text-xs tracking-wide text-[var(--tl-muted)]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[56rem] border border-[var(--tl-ink)]/10 bg-[var(--tl-paper-deep)]">
        <div className="flex min-h-[min(52vh,28rem)] flex-col justify-center gap-6 p-10 md:p-16">
          {extract
            ? Object.entries(extract.pairing).map(([role, p]) => (
                <p
                  key={role}
                  className="leading-[1.05] tracking-[-0.03em]"
                  style={{
                    fontFamily: resolvedStack(p.typefaceId, p.cssStack),
                    fontSize:
                      role === "display"
                        ? "clamp(2.5rem, 6vw, 4rem)"
                        : role === "body"
                          ? "1.25rem"
                          : "1.5rem",
                    fontWeight: p.weight ?? 400,
                  }}
                >
                  <span className="mb-1 block text-[0.65rem] font-semibold tracking-[0.18em] text-[var(--tl-muted)] uppercase">
                    {role}
                  </span>
                  {p.family}
                </p>
              ))
            : null}
        </div>
      </div>

      {specimen ? (
        <div className="mx-auto mt-16 max-w-[52rem] space-y-12">
          <section>
            <p className="tl-kicker mb-3">Type system</p>
            <p className="text-xl leading-relaxed text-[var(--tl-ink-soft)] md:text-2xl">
              {specimen.summary}
            </p>
            {specimen.summaryZh ? (
              <p className="mt-3 text-lg text-[var(--tl-muted)]">{specimen.summaryZh}</p>
            ) : null}
            <p className="mt-4 text-sm text-[var(--tl-muted)]">
              Pairing: {specimen.pairing.strategy}
              {specimen.pairing.contrast ? ` · contrast ${specimen.pairing.contrast}` : ""}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">Typefaces</h2>
            <ul className="divide-y divide-[var(--tl-line-soft)] border-y border-[var(--tl-ink)]">
              {specimen.typefaces.map((ref) => {
                const tf = getTypeface(ref.typefaceId);
                if (!tf) return null;
                return (
                  <li
                    key={ref.typefaceId}
                    className="flex flex-wrap items-baseline justify-between gap-3 py-5"
                  >
                    <Link
                      href={`/typefaces/${tf.id}`}
                      className="text-2xl font-medium tracking-tight no-underline hover:opacity-55"
                      style={{ fontFamily: resolvedStack(tf.id, tf.cssStack) }}
                    >
                      {tf.family}
                    </Link>
                    {/* Role and weight are printed only when the source recorded
                        them. They used to be assigned by array index, so this
                        line said "display · 600" about whichever face happened
                        to sort first. */}
                    <span className="text-sm tracking-wide text-[var(--tl-muted)]">
                      {ref.role ? `${ref.role}` : null}
                      {ref.role && ref.weight ? ` · ${ref.weight}` : ""}
                      {ref.role ? " · " : ""}
                      {tf.license.spdxOrLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {specimen.hierarchy ? (
            <section>
              <h2 className="mb-4 text-2xl font-semibold tracking-tight">Hierarchy</h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--tl-ink)] text-[var(--tl-muted)]">
                    <th className="py-3 pr-4 font-semibold tracking-wide uppercase">Role</th>
                    <th className="py-3 pr-4 font-semibold tracking-wide uppercase">Size</th>
                    <th className="py-3 pr-4 font-semibold tracking-wide uppercase">Weight</th>
                    <th className="py-3 font-semibold tracking-wide uppercase">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {specimen.hierarchy.map((step) => (
                    <tr
                      key={`${step.role}-${step.rem}`}
                      className="border-b border-[var(--tl-line-soft)]"
                    >
                      <td className="py-3.5 pr-4 font-medium">{step.role}</td>
                      <td className="py-3.5 pr-4">{step.rem}rem</td>
                      <td className="py-3.5 pr-4">{step.weight}</td>
                      <td className="py-3.5">{step.tracking ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      ) : null}

      {extract ? (
        <section className="mx-auto mt-16 max-w-[52rem] border-2 border-[var(--tl-ink)] bg-white p-8 md:p-10">
          <p className="tl-kicker mb-2">For agents</p>
          <h2 className="text-2xl font-semibold tracking-tight">Extract pack</h2>
          <p className="mt-2 text-sm text-[var(--tl-muted)]">
            schema v{extract.schemaVersion} · faces as listed by the source · licenses included
          </p>
          <pre className="mt-6 max-h-80 overflow-auto bg-[var(--tl-ink)] p-5 text-xs leading-relaxed text-neutral-200">
            {JSON.stringify(extract, null, 2)}
          </pre>
          <p className="mt-4 text-sm">
            <Link href="/docs/agents" className="font-medium underline-offset-4 hover:underline">
              Agent docs →
            </Link>
          </p>
        </section>
      ) : null}

      {work.curatorNotes ? (
        <p className="mx-auto mt-12 max-w-[52rem] text-sm text-[var(--tl-muted)]">
          {work.curatorNotes}
        </p>
      ) : null}
    </article>
  );
}

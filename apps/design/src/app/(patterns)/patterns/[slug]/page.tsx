import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatternSpecimen } from "@/components/pattern-specimen";
import { PATTERNS, PATTERNS_BY_SLUG } from "@/lib/pattern-data";
import { verifyCast } from "@/lib/patterns";
import { Mono, PageHeader, Section } from "../../../(tokens)/tokens/_components/primitives";

export function generateStaticParams() {
  return PATTERNS.map((pattern) => ({ slug: pattern.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pattern = PATTERNS_BY_SLUG.get(slug);
  if (!pattern) return {};
  return { title: `${pattern.title} — patterns`, description: pattern.intro };
}

/**
 * One shape for all seven patterns.
 *
 * The first of these was a page of its own, and writing the second made the
 * cost obvious: seven hand-laid pages are seven chances for the table to be
 * spaced differently, the cast to be rendered differently, or a section to be
 * quietly dropped. The decision content differs; the presentation should not.
 *
 * So the editorial half lives in `pattern-data.ts` and this renders it. A new
 * pattern is an entry in that array — it gets the table, the verified cast and
 * the sidebar link without touching this file.
 */
export default async function PatternPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pattern = PATTERNS_BY_SLUG.get(slug);
  if (!pattern) notFound();

  const cast = verifyCast(pattern.cast);
  const gone = cast.filter((entry) => !entry.exists);

  return (
    <div>
      <PageHeader eyebrow={`patterns / ${pattern.slug}`} title={pattern.title}>
        <p>{pattern.intro}</p>
      </PageHeader>

      <Section title="Live">
        <PatternSpecimen slug={pattern.slug} />
      </Section>

      <Section title="Which one">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[14px]">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {pattern.columns.map((column) => (
                  <th className="pb-2 font-medium" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pattern.rows.map((row) => (
                <tr className="align-top" key={row.subject}>
                  <td className="py-3 pr-6">
                    <Mono>{row.subject}</Mono>
                  </td>
                  <td className="py-3 pr-6 text-foreground">{row.use}</td>
                  <td className="py-3 text-muted-foreground">{row.not ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pattern.note ? (
          <p className="mt-6 max-w-2xl text-[13px] text-muted-foreground leading-relaxed">
            {pattern.note}
          </p>
        ) : null}
      </Section>

      <Section
        note={
          <p>
            Every component this pattern names, checked against the barrels at build time. A name
            that stops being exported turns red here on the next build instead of quietly misleading
            whoever reads the page next.
          </p>
        }
        title="Cast"
      >
        <ul className="flex flex-wrap gap-2">
          {cast.map((entry) => (
            <li
              className={`rounded-[var(--radius-md)] px-2.5 py-1 font-mono text-[12px] ${
                entry.exists
                  ? "bg-muted text-foreground"
                  : "bg-destructive/10 text-[hsl(var(--destructive-strong))] line-through"
              }`}
              key={entry.name}
            >
              {entry.name}
            </li>
          ))}
        </ul>
        {gone.length > 0 ? (
          <p className="mt-4 max-w-2xl text-[13px] text-muted-foreground leading-relaxed">
            {gone.length} of these are named by the design-docs version of this page and are no
            longer exported by anything. They are struck through rather than deleted so the removal
            is visible; the rows above are what the library actually offers.
          </p>
        ) : null}
      </Section>
    </div>
  );
}

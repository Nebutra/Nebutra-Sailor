import type { Metadata } from "next";
import { FitStage } from "@/components/fit-stage";
import { ShowcaseDemo } from "@/components/showcase-demo";
import { showcaseGroups } from "@/lib/showcase";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Showcase — ${SITE_NAME}`,
  description:
    "The rest of the @nebutra/ui catalog, rendered live and grouped by category, one card per component.",
};

/**
 * The part of the catalog the component pages do not cover, organised the way
 * the catalog is: by category, one card per component.
 *
 * It used to be every demo file in alphabetical order — 131 cards, four
 * accordions and five carousels in a row, each an 880px stage shrunk to 40%, so
 * most cards read as an empty white box under a mono file name. Benchmarked
 * against Geist's component overview (category bands, one framed preview per
 * component) and shadcn's blocks (uniform frame, centred preview, plain title).
 */

export default function ShowcasePage() {
  const groups = showcaseGroups();
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col">
      <header className="flex max-w-3xl flex-col gap-4 py-12">
        <h1 className="text-4xl text-foreground tracking-display [font-weight:var(--font-weight-heading,600)]">
          Showcase
        </h1>
        <p className="text-lg text-neutral-11">
          The rest of the library, rendered live from{" "}
          <code className="font-mono text-base">@nebutra/ui/catalog</code>: {total} components
          without a page of their own yet, grouped as the catalog groups them.
        </p>
        <nav aria-label="Categories" className="flex flex-wrap gap-2 pt-2">
          {groups.map((group) => (
            <a
              className="rounded-[var(--radius-pill,9999px)] border border-border bg-card px-3 py-1 text-neutral-11 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              href={`#${group.id}`}
              key={group.id}
            >
              {group.title}
              <span className="ms-1.5 text-muted-foreground tabular-nums">
                {group.items.length}
              </span>
            </a>
          ))}
        </nav>
      </header>

      {groups.map((group) => (
        <section
          aria-labelledby={`${group.id}-title`}
          className="scroll-mt-20 border-border border-t py-12"
          id={group.id}
          key={group.id}
        >
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2
              className="text-2xl text-foreground tracking-heading [font-weight:var(--font-weight-heading,600)]"
              id={`${group.id}-title`}
            >
              {group.title}
            </h2>
            <span className="text-muted-foreground text-sm tabular-nums">
              {group.items.length} {group.items.length === 1 ? "component" : "components"}
            </span>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <li
                className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card"
                key={item.id}
              >
                <FitStage>
                  <ShowcaseDemo id={item.demo} />
                </FitStage>
                <div className="flex items-center justify-between gap-3 border-border border-t px-4 py-3">
                  <span className="font-medium text-foreground text-sm">{item.title}</span>
                  <span className="flex items-center gap-2 text-muted-foreground text-xs">
                    {item.status === "experimental" ? <span>Experimental</span> : null}
                    {item.variants > 1 ? (
                      <span className="tabular-nums">{item.variants} demos</span>
                    ) : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

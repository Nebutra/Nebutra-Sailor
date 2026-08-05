import Link from "next/link";
import { ComponentPreview } from "@/lib/components/previews";
import {
  COMPONENTS,
  CONSUMER_COUNT_MEASURED,
  componentsInGroup,
  coveredNames,
  GROUPS,
} from "@/lib/components/registry";
import { componentExports, storyFor, type UiExport } from "@/lib/components/ui-source";
import { SITE_NAME } from "@/lib/site";

/**
 * The scan reads `packages/design/ui/src` off disk, so it has to run where the
 * repo is — at build time. This page uses no dynamic request API, which is what
 * keeps it prerendered; a `force-static` directive is deliberately not used
 * because it would conflict with Next 16 `cacheComponents`.
 */

export const metadata = {
  title: `Components — ${SITE_NAME}`,
  description:
    "Every component in @nebutra/ui, rendered live against live tokens. Covered components link to their states; the rest are listed as gaps.",
};

interface GroupView {
  id: string;
  label: string;
  note: string;
  importPath: string;
  barrel: string;
  exports: UiExport[];
  covered: UiExport[];
  gaps: UiExport[];
}

function buildGroups(): GroupView[] {
  const claimed = coveredNames();

  return GROUPS.map((group) => {
    const exports = componentExports(group.barrel);
    return {
      id: group.id,
      label: group.label,
      note: group.note,
      importPath: group.importPath,
      barrel: group.barrel,
      exports,
      covered: exports.filter((e) => claimed.has(e.name)),
      gaps: exports.filter((e) => !claimed.has(e.name)),
    };
  });
}

/**
 * Names this app claims to document that the barrel does not export. A page
 * pointing at an export that no longer exists is exactly the drift this site
 * exists to prevent, so it is reported on the page rather than left to rot.
 */
function registryDrift(groups: GroupView[]): { name: string; slug: string; group: string }[] {
  const byGroup = new Map(groups.map((g) => [g.id, new Set(g.exports.map((e) => e.name))]));
  const drift: { name: string; slug: string; group: string }[] = [];

  for (const entry of COMPONENTS) {
    const known = byGroup.get(entry.group);
    if (!known) continue;
    for (const name of entry.covers) {
      // cva helpers and type aliases are not component-shaped exports and are
      // intentionally outside the measured population.
      if (name.endsWith("Variants")) continue;
      if (!known.has(name)) drift.push({ name, slug: entry.slug, group: entry.group });
    }
  }

  return drift;
}

export default function ComponentsIndexPage() {
  const groups = buildGroups();
  const drift = registryDrift(groups);

  const totalExports = groups.reduce((sum, g) => sum + g.exports.length, 0);
  const totalCovered = groups.reduce((sum, g) => sum + g.covered.length, 0);

  return (
    <div className="flex flex-col gap-12">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">Components</h1>
        <p className="text-muted-foreground">
          Real components from <code className="font-mono text-sm">@nebutra/ui</code>, imported and
          rendered on this page against the live tokens. Nothing here is a screenshot or a code
          fence, so a token that breaks a component breaks this site.
        </p>
        <p className="text-muted-foreground text-sm">
          The list below is derived from each barrel's exports at build time. A newly exported
          component appears here as a gap on the next build rather than going unnoticed.{" "}
          <strong className="font-medium text-foreground">
            {totalCovered} of {totalExports}
          </strong>{" "}
          component-shaped exports have a page.
        </p>
      </header>

      {drift.length > 0 ? (
        <section className="rounded-xl bg-destructive/10 p-6" aria-labelledby="drift-heading">
          <h2
            className="font-medium text-[hsl(var(--destructive-strong))] text-base"
            id="drift-heading"
          >
            Registry drift — {drift.length} claimed export{drift.length === 1 ? "" : "s"} not found
          </h2>
          <p className="mt-2 max-w-prose text-muted-foreground text-sm">
            These names are listed in this app's coverage registry but are not exported by the
            barrel any more. Either the export was renamed or removed, or the registry entry is
            wrong. Fix <code className="font-mono text-xs">src/lib/components/registry.ts</code>.
          </p>
          <ul className="mt-4 flex flex-col gap-1">
            {drift.map((item) => (
              <li className="font-mono text-sm text-foreground" key={`${item.slug}-${item.name}`}>
                {item.name} <span className="text-muted-foreground">— claimed by /{item.slug}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groups.map((group) => (
        <GroupSection group={group} key={group.id} />
      ))}

      <footer className="max-w-3xl text-muted-foreground text-sm">
        <p>
          Consumer counts are import-site counts across <code className="font-mono">apps/**</code>,
          measured {CONSUMER_COUNT_MEASURED} by name grep. They are why a component is on the
          covered list, accurate to about ±2, and not a claim about the component itself.
        </p>
      </footer>
    </div>
  );
}

function GroupSection({ group }: { group: GroupView }) {
  const covered = componentsInGroup(group.id as never);

  return (
    <section aria-labelledby={`${group.id}-heading`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-medium text-foreground text-xl" id={`${group.id}-heading`}>
            {group.label}
          </h2>
          <code className="font-mono text-muted-foreground text-xs">{group.importPath}</code>
          <span className="text-muted-foreground text-xs">
            {group.covered.length} / {group.exports.length} covered
          </span>
        </div>
        <p className="max-w-prose text-muted-foreground text-sm">{group.note}</p>
      </div>

      {covered.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {covered.map((entry) => (
            <li key={entry.slug}>
              <Link
                className="flex h-full flex-col overflow-hidden rounded-xl bg-muted/40 no-underline shadow-ambient-sm transition-shadow duration-flow ease-out hover:shadow-ambient-md"
                href={`/components/${entry.slug}`}
              >
                {/* The specimen sits on the card surface rather than the page
                    surface, so you see the component against a real background
                    instead of floating on the index's own colour. w-full, not
                    w-fit: a control with no intrinsic width — Progress,
                    Separator — collapses to nothing under w-fit and renders an
                    empty card. */}
                <div className="flex min-h-[104px] items-center justify-center bg-card px-4 py-5">
                  <div className="pointer-events-none w-full [&>*]:justify-center">
                    <ComponentPreview name={entry.name} slug={entry.slug} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground text-sm">{entry.name}</span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {entry.consumers} uses
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {entry.blurb}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {group.gaps.length > 0 ? <Gaps gaps={group.gaps} groupId={group.id} /> : null}
    </section>
  );
}

function Gaps({ gaps, groupId }: { gaps: UiExport[]; groupId: string }) {
  const withStory = gaps.filter((gap) => storyFor(gap.file.replace(/^.*?ui\/src\//, "")) !== null);
  const storyless = gaps.filter((gap) => !withStory.includes(gap));

  return (
    <details className="rounded-xl bg-muted/25 p-4">
      <summary className="cursor-pointer font-medium text-foreground text-sm">
        {gaps.length} export{gaps.length === 1 ? "" : "s"} in this group have no page yet
      </summary>
      <p className="mt-3 max-w-prose text-muted-foreground text-sm">
        Derived from the barrel, so this list shrinks only when a page is added and grows on its own
        when an export is. {withStory.length} of these have a colocated Storybook story to work
        from; {storyless.length} have nothing at all and are the more expensive half of the
        worklist. Many are compound sub-parts documented on their parent's page — those are the
        cheapest entries to clear, by adding the name to the parent entry's{" "}
        <code className="font-mono text-xs">covers</code> list.
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {gaps.map((gap) => (
          <code
            className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            key={`${groupId}-${gap.name}`}
            title={gap.file}
          >
            {gap.name}
          </code>
        ))}
      </div>
    </details>
  );
}

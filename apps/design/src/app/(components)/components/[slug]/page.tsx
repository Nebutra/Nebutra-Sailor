import Link from "next/link";
import { notFound } from "next/navigation";
import type * as React from "react";
import type { DemoProps, Derived } from "@/lib/components/derived";
import { PreviewTheme } from "@/lib/components/preview-theme";
import type { ComponentEntry } from "@/lib/components/registry";
import { COMPONENTS, COMPONENTS_BY_SLUG, GROUPS } from "@/lib/components/registry";
import {
  type CvaSpec,
  findConstArray,
  findCva,
  findObjectKeys,
  findUnion,
  storyFor,
} from "@/lib/components/ui-source";
import { SITE_NAME } from "@/lib/site";

/**
 * No `dynamic` directive on purpose. These routes touch the filesystem (see
 * ui-source.ts), so they must be prerendered, and `generateStaticParams` plus
 * the absence of any dynamic request API is what gets them prerendered. Pinning
 * `force-static` here would conflict with Next 16 `cacheComponents` if the app
 * shell turns it on.
 */

export function generateStaticParams() {
  return COMPONENTS.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = COMPONENTS_BY_SLUG.get(slug);
  if (!entry) return {};

  return {
    title: `${entry.name} — ${SITE_NAME}`,
    description: entry.blurb,
  };
}

function derive(entry: ComponentEntry): Derived {
  const cva: Record<string, CvaSpec> = {};
  for (const request of entry.cva ?? []) {
    const found = findCva(request.file ?? entry.entry, request.name);
    if (found) cva[request.as] = found;
  }

  const axes: Record<string, string[]> = {};
  for (const request of entry.axes ?? []) {
    const values =
      request.kind === "union"
        ? findUnion(request.file, request.name)
        : request.kind === "constArray"
          ? findConstArray(request.file, request.name)
          : findObjectKeys(request.file, request.name);
    if (values) axes[request.as] = values;
  }

  return {
    cva,
    axes,
    sourceFile: `packages/design/ui/src/${entry.entry}`,
    storyFile: storyFor(entry.entry),
  };
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = COMPONENTS_BY_SLUG.get(slug);
  if (!entry) notFound();

  const derived = derive(entry);
  const group = GROUPS.find((g) => g.id === entry.group);

  // Relative specifier so the bundler can code-split one chunk per demo. The
  // slug is validated against the registry above, so this cannot resolve to
  // anything that is not a demo module. A dynamic specifier resolves to `any`,
  // so the cast is what holds the demo contract at this call site — every demo
  // module's default export takes `{ derived }`.
  const mod = (await import(`../../../../lib/components/demos/${entry.slug}`)) as {
    default: React.ComponentType<DemoProps>;
  };
  const Demo = mod.default;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 py-12 md:px-6">
      <header className="flex flex-col gap-4">
        <Link
          className="text-muted-foreground text-sm no-underline hover:underline"
          href="/components"
        >
          ← All components
        </Link>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-semibold text-3xl text-foreground tracking-tight">{entry.name}</h1>
            <span className="text-muted-foreground text-xs">
              {entry.consumers} import sites across apps
            </span>
          </div>
          <p className="max-w-prose text-muted-foreground">{entry.blurb}</p>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Meta label="Import">
            <code className="font-mono text-xs">
              {`import { ${entry.name} } from "${group?.importPath ?? "@nebutra/ui"}"`}
            </code>
          </Meta>
          <Meta label="Source">
            <code className="font-mono text-xs">{derived.sourceFile}</code>
          </Meta>
          <Meta label="Storybook story">
            {derived.storyFile ? (
              <code className="font-mono text-xs">{derived.storyFile}</code>
            ) : (
              <span className="text-muted-foreground text-xs">
                none — this page is the only visual coverage
              </span>
            )}
          </Meta>
        </dl>

        <DerivedSummary derived={derived} />
      </header>

      <PreviewTheme>
        <Demo derived={derived} />
      </PreviewTheme>

      {/* Full width, matching every section above it. At max-w-prose this sat
          at roughly two-fifths the width of the specimens and read as a stray
          box rather than the page's closing note. */}
      <footer className="rounded-xl bg-muted/30 p-5 text-muted-foreground text-sm">
        <p className="font-medium text-foreground">Why there is no prop table</p>
        <p className="mt-2 max-w-prose">
          A prop table has to be extracted from the TypeScript types to be trustworthy, and this app
          does not extract them. A hand-written one would be wrong within a release — the
          design-docs site currently documents props that do not exist, including one rendered with
          a package that was removed from the repo. Until the extraction is real, the source file
          named at the top of this page is the authority, and the specimens above are the behaviour.
        </p>
      </footer>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

/**
 * States plainly which axes on this page came out of the library source. If this
 * block is empty for a component that has variants, the extractor is broken.
 */
function DerivedSummary({ derived }: { derived: Derived }) {
  const cvaEntries = Object.values(derived.cva);
  const axisEntries = Object.entries(derived.axes);

  if (cvaEntries.length === 0 && axisEntries.length === 0) {
    return (
      <p className="max-w-prose text-muted-foreground text-xs">
        This component declares no cva variant map and no enumerable size or tone union, so every
        state below is hand-composed rather than derived.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        Derived from source at build time — add a value in the library and it appears here:
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {cvaEntries.map((spec) =>
          Object.entries(spec.variants).map(([axis, values]) => (
            <div className="flex items-baseline gap-2" key={`${spec.name}-${axis}`}>
              <code className="font-mono text-foreground text-xs">{axis}</code>
              <span className="text-muted-foreground text-xs">
                {values.length} values · {spec.name}
              </span>
            </div>
          )),
        )}
        {axisEntries.map(([axis, values]) => (
          <div className="flex items-baseline gap-2" key={`axis-${axis}`}>
            <code className="font-mono text-foreground text-xs">{axis}</code>
            <span className="text-muted-foreground text-xs">{values.length} values</span>
          </div>
        ))}
      </div>
    </div>
  );
}

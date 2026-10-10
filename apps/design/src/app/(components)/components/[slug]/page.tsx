import { CopyButton } from "@nebutra/ui/primitives";
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
import { PageHeader } from "../../../(tokens)/tokens/_components/primitives";

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

  const importLine = `import { ${entry.name} } from "${group?.importPath ?? "@nebutra/ui"}";`;

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow={`components / ${entry.slug}`} title={entry.name}>
        <p>{entry.blurb}</p>
      </PageHeader>

      {/* Usage, then provenance: the import a reader copies, and under it in
          the strip where the facts about a specimen go, where it comes from. */}
      <div className="-mt-4 mb-12 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-foreground text-sm">
            {importLine}
          </code>
          <CopyButton
            className="shrink-0 text-muted-foreground"
            showToast={false}
            tooltipText="Copy import"
            value={importLine}
          />
        </div>
        <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2 border-border border-t bg-background px-4 py-3 text-xs">
          <Meta label="Source">
            <code className="break-all font-mono">{derived.sourceFile}</code>
          </Meta>
          <Meta label="Story">
            {derived.storyFile ? (
              <code className="break-all font-mono">{derived.storyFile}</code>
            ) : (
              <span>none — this page is the only visual coverage</span>
            )}
          </Meta>
          <Meta label="Used by">
            <span className="tabular-nums">{entry.consumers} import sites</span>
          </Meta>
        </dl>
      </div>

      <DerivedSummary derived={derived} />

      <PreviewTheme>
        <Demo derived={derived} />
      </PreviewTheme>

      <footer className="-mx-4 border-border border-t px-4 pt-12 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
        <h2 className="m-0 text-foreground text-lg leading-heading tracking-heading">
          Why there is no prop table
        </h2>
        <p className="m-0 mt-3 max-w-3xl text-neutral-11">
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
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="m-0 text-neutral-11">{children}</dd>
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
      <p className="m-0 mb-12 max-w-3xl text-muted-foreground text-sm">
        This component declares no cva variant map and no enumerable size or tone union, so every
        state below is hand-composed rather than derived.
      </p>
    );
  }

  return (
    <div className="mb-12 flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-muted-foreground">Derived from source</span>
      {cvaEntries.map((spec) =>
        Object.entries(spec.variants).map(([axis, values]) => (
          <span
            className="inline-flex items-baseline gap-1.5 rounded-[var(--radius-md)] border border-border bg-card px-2 py-0.5"
            key={`${spec.name}-${axis}`}
          >
            <code className="font-mono text-foreground text-xs">{axis}</code>
            <span className="text-muted-foreground text-xs tabular-nums">{values.length}</span>
          </span>
        )),
      )}
      {axisEntries.map(([axis, values]) => (
        <span
          className="inline-flex items-baseline gap-1.5 rounded-[var(--radius-md)] border border-border bg-card px-2 py-0.5"
          key={`axis-${axis}`}
        >
          <code className="font-mono text-foreground text-xs">{axis}</code>
          <span className="text-muted-foreground text-xs tabular-nums">{values.length}</span>
        </span>
      ))}
      <span className="ml-1 text-muted-foreground">
        — add a value in the library and it appears here
      </span>
    </div>
  );
}

import { notFound } from "next/navigation";
import type * as React from "react";
import { ApiBlocks } from "@/components/component-api-table";
import { InstallCard } from "@/components/component-code";
import { A11yList, DoDont, KeyboardTable } from "@/components/component-guidance";
import { ComponentMaintainers } from "@/components/component-maintainers";
import { ComponentSection } from "@/components/component-section";
import { UsedBy } from "@/components/component-used-by";
import { apiForEntry } from "@/lib/components/api-docs";
import { mergeCva } from "@/lib/components/api-merge";
import { importLine } from "@/lib/components/code-gen";
import type { DemoProps, Derived } from "@/lib/components/derived";
import { LIVE_DOCS } from "@/lib/components/docs";
import { GUIDANCE } from "@/lib/components/guidance";
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

/**
 * What a reader pastes to start using the component: the exports the page
 * covers, minus the cva helpers. A long list falls back to the headline name
 * rather than a wall of imports.
 */
function importLineFor(entry: ComponentEntry, from: string): string {
  const names = entry.covers.filter((name) => !name.endsWith("Variants"));
  const shown = names.length > 0 && names.length <= 4 ? names : [entry.name];
  return importLine([...shown], from);
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

  // Every registered page has live documentation; the shared coverage check
  // keeps this list and the client modules aligned with the registry.
  const live = LIVE_DOCS.has(entry.slug)
    ? ((await import(`../../../../lib/components/docs/${entry.slug}`)) as {
        Playground: React.ComponentType<DemoProps>;
        StatesMatrix: React.ComponentType<DemoProps>;
      })
    : null;

  const { blocks, unresolved } = apiForEntry(entry, COMPONENTS);
  const apiBlocks = blocks.map((block) => mergeCva(block, derived.cva));
  const guidance = GUIDANCE[entry.slug];

  const importLine = importLineFor(entry, group?.importPath ?? "@nebutra/ui");

  const axes = [
    ...Object.values(derived.cva).flatMap((spec) =>
      Object.entries(spec.variants).map(([name, values]) => ({ name, count: values.length })),
    ),
    ...Object.entries(derived.axes).map(([name, values]) => ({ name, count: values.length })),
  ];

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow={`components / ${entry.slug}`} title={entry.name}>
        <p>{entry.blurb}</p>
      </PageHeader>

      <div className="-mt-4 mb-12 max-w-3xl">
        <InstallCard importLine={importLine} />
      </div>

      {live ? (
        <ComponentSection
          note={
            <p>
              Change a prop and the component and the code beside it change together. Copy the code
              when it looks right.
            </p>
          }
          title="Playground"
        >
          <live.Playground derived={derived} />
        </ComponentSection>
      ) : null}

      <PreviewTheme>
        <ComponentSection title="Examples">
          <Demo derived={derived} />
        </ComponentSection>
        {live ? <live.StatesMatrix derived={derived} /> : null}
      </PreviewTheme>

      <ComponentSection
        note={
          <p>
            Read from the TypeScript types in{" "}
            <code className="break-all font-mono text-sm">{derived.sourceFile}</code> when this site
            is built, so it changes when the component does.
          </p>
        }
        title="API"
      >
        <ApiBlocks blocks={apiBlocks} unresolved={unresolved} />
      </ComponentSection>

      {guidance?.keyboard || guidance?.a11y ? (
        <ComponentSection title="Keyboard and accessibility">
          <div className="flex flex-col gap-10">
            {guidance.keyboard ? <KeyboardTable rows={guidance.keyboard} /> : null}
            {guidance.a11y ? <A11yList items={guidance.a11y} /> : null}
          </div>
        </ComponentSection>
      ) : null}

      {guidance?.dos && guidance.donts ? (
        <ComponentSection title="Do and don't">
          <DoDont donts={guidance.donts} dos={guidance.dos} />
        </ComponentSection>
      ) : null}

      <ComponentSection title="Used in">
        <UsedBy entry={entry} />
      </ComponentSection>

      <ComponentMaintainers
        axes={axes}
        demoFile={`apps/design/src/lib/components/demos/${entry.slug}.tsx`}
        registryFile="apps/design/src/lib/components/registry.ts"
        sourceFile={derived.sourceFile}
        storyFile={derived.storyFile}
      />
    </div>
  );
}

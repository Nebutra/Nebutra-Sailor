import { CATALOG, CATALOG_CATEGORIES, type CatalogCategory } from "@nebutra/ui/catalog";
import { Badge, Button } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { CodeSample } from "@/components/code-sample";
import { CommandLine } from "@/components/command-line";
import { COMPONENTS, GROUPS } from "@/lib/components/registry";
import { SITE_NAME, STUDIO_URL } from "@/lib/site";
import { workspacePackage } from "@/lib/site-stats";
import {
  Note,
  PageHeader,
  Section,
  Table,
  Td,
  Th,
  Tr,
} from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Develop",
  description: `Install ${SITE_NAME}, import a component, and choose between the Core, Patterns and Expressive layers.`,
};

/**
 * The layers are an editorial grouping of the catalog's own categories. The
 * categories, their entries and the import path of each entry come from the
 * catalog; only the grouping and the advice are written here.
 */
const LAYERS: ReadonlyArray<{
  name: string;
  categories: readonly CatalogCategory[];
  use: string;
  avoid: string;
}> = [
  {
    name: "Core",
    categories: [
      "actions",
      "forms",
      "overlays",
      "navigation",
      "data-display",
      "feedback",
      "layout",
    ],
    use: "Every working screen: settings, tables, forms, dialogs. Quiet by default, and the first place to look.",
    avoid: "Nothing — start here before reaching for anything else.",
  },
  {
    name: "Patterns",
    categories: ["charts", "ai"],
    use: "Compositions you would otherwise rebuild: charts, maps, chat and agent surfaces.",
    avoid: "When a Core component with a prop already does it.",
  },
  {
    name: "Expressive",
    categories: ["marketing", "media", "effects", "text-motion"],
    use: "Landing pages and a single moment of emphasis in a product.",
    avoid: "The chrome of a working screen. Motion and effects there compete with the data.",
  },
];

function layerRows() {
  return LAYERS.map((layer) => {
    const entries = CATALOG.filter((entry) => layer.categories.includes(entry.category));
    const titles = CATALOG_CATEGORIES.filter((category) =>
      layer.categories.includes(category.id),
    ).map((category) => category.title);
    return {
      ...layer,
      count: entries.length,
      stable: entries.filter((entry) => entry.status === "stable").length,
      imports: [...new Set(entries.map((entry) => entry.import))],
      titles,
    };
  });
}

const PACKAGES = [
  { dir: "packages/design/ui", role: "Components, layouts, patterns and hooks." },
  { dir: "packages/design/tokens", role: "Runtime CSS variables, the theme provider and fonts." },
  { dir: "packages/design/icons", role: "The icon set, tree-shaken per glyph." },
  {
    dir: "packages/design/theme",
    role: "The design languages and the control that switches them.",
  },
  { dir: "packages/design/brand", role: "The mark, the wordmark and brand metadata." },
  { dir: "packages/ops/create-sailor", role: "Scaffolds a project, optionally in a chosen look." },
] as const;

const USAGE = `import { Badge, Button } from "@nebutra/ui/primitives";

export function Release() {
  return (
    <div className="flex items-center gap-2">
      <Button>Deploy</Button>
      <Badge variant="secondary">Ready</Badge>
    </div>
  );
}`;

export default function DevelopPage() {
  const layers = layerRows();
  const packages = PACKAGES.map((entry) => ({ ...entry, ...workspacePackage(entry.dir) }));

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="/develop" title="Develop">
        <p>
          Add the library to a React app, import a component, and know which of the three layers a
          piece of UI belongs to. Everything on this page is checked against the package source when
          the site is built.
        </p>
      </PageHeader>

      <Section
        note={
          <p>
            Tailwind v4 apps import one stylesheet. Without Tailwind, import{" "}
            <code className="font-mono text-ui">@nebutra/tokens/styles.css</code> once at the root
            for the CSS variables.
          </p>
        }
        title="Install"
      >
        <div className="flex max-w-2xl flex-col gap-4">
          <CommandLine command="pnpm add @nebutra/ui" />
          <CodeSample caption="app/globals.css" code={'@import "@nebutra/ui/styles.css";'} />
        </div>
      </Section>

      <Section
        note={
          <p>
            Core components come from <code className="font-mono text-ui">/primitives</code>, and
            the rest of the library is a sibling import. Every component page lists its props,
            variants and states.
          </p>
        }
        title="Use a component"
      >
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <CodeSample caption="release.tsx" code={USAGE} />
          <div className="flex min-h-32 flex-col items-start justify-center gap-3 rounded-lg border border-border bg-card p-6">
            <p className="m-0 text-muted-foreground text-xs">Rendered from the library</p>
            <div className="flex items-center gap-2">
              <Button>Deploy</Button>
              <Badge variant="secondary">Ready</Badge>
            </div>
          </div>
        </div>
      </Section>

      <Section
        note={
          <p>
            A new project does not have to start in the default look. Pass a design language, or a
            preset code from{" "}
            <a
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              href={STUDIO_URL}
              rel="noreferrer"
              target="_blank"
            >
              Sailor Studio
            </a>
            , and the scaffold is generated in that look.
          </p>
        }
        title="Start from a look"
      >
        <div className="max-w-2xl">
          <CommandLine command="npx create-sailor@latest my-app --preset linear" />
        </div>
      </Section>

      <Section
        note={
          <p>
            The catalog sorts every component into a category. These layers group the categories by
            how much a product should lean on them. The counts are the catalog's own;{" "}
            <strong className="font-medium text-foreground">stable</strong> means something outside
            the library already imports it.
          </p>
        }
        title="Layers"
      >
        <Table>
          <thead>
            <tr>
              <Th>Layer</Th>
              <Th>Import from</Th>
              <Th>Components</Th>
              <Th>Reach for it when</Th>
              <Th>Not when</Th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer, index) => (
              <Tr index={index} key={layer.name}>
                <Td className="align-top">
                  <span className="font-medium text-foreground">{layer.name}</span>
                  <span className="mt-1 block text-muted-foreground text-xs">
                    {layer.titles.join(", ")}
                  </span>
                </Td>
                <Td className="align-top">
                  {layer.imports.map((path) => (
                    <code className="block font-mono text-ui" key={path}>
                      {path}
                    </code>
                  ))}
                </Td>
                <Td className="align-top tabular-nums">
                  {layer.count}
                  <span className="block text-muted-foreground text-xs">{layer.stable} stable</span>
                </Td>
                <Td className="align-top text-neutral-11">{layer.use}</Td>
                <Td className="align-top text-neutral-11">{layer.avoid}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        note={
          <p>
            The library is split so an app imports only what it renders. {COMPONENTS.length}{" "}
            components have a documented page, grouped as{" "}
            {GROUPS.map((group) => group.label.toLowerCase()).join(", ")}.
          </p>
        }
        title="Packages"
      >
        <Table>
          <thead>
            <tr>
              <Th>Package</Th>
              <Th>Version</Th>
              <Th>What it is</Th>
            </tr>
          </thead>
          <tbody>
            {packages.map((entry, index) => (
              <Tr index={index} key={entry.name}>
                <Td>
                  <code className="font-mono text-foreground text-ui">{entry.name}</code>
                </Td>
                <Td className="text-muted-foreground tabular-nums">{entry.version}</Td>
                <Td className="text-neutral-11">{entry.role}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Next">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {[
            { href: "/components", label: "Components", body: "Every export, with its states." },
            { href: "/showcase", label: "Showcase", body: "Components at the size they render." },
            { href: "/adoption", label: "Adoption", body: "What the Nebutra products use." },
          ].map((item) => (
            <Link
              className="flex flex-col gap-1 bg-background p-5 no-underline transition-colors duration-micro hover:bg-card"
              href={item.href}
              key={item.href}
            >
              <span className="font-medium text-base text-foreground">{item.label}</span>
              <span className="text-neutral-11 text-sm">{item.body}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Note>
            The packages are published as foundation-stage libraries: they are used across the
            Nebutra products, and their own metadata does not yet mark them production-ready.
          </Note>
        </div>
      </Section>
    </div>
  );
}

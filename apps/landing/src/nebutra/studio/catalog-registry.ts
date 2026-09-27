import { CATALOG, CATALOG_CATEGORIES, entryForDemo } from "@nebutra/ui/catalog";
import sources from "@nebutra/ui/catalog/sources.json";

/**
 * The @nebutra/ui catalog as a shadcn registry (ADR 2026-09-27 UI catalog):
 * every demo is a `registry:example` item at `/r/<demo>.json`, and
 * `/r/registry.json` indexes them. The item is the demo file itself — the code a
 * reader copies into a Sailor project, where @nebutra/ui is already a workspace
 * package, so only third-party imports are listed as dependencies.
 */

const DEMO_SOURCES = sources as Record<string, string>;

const SCHEMA = "https://ui.shadcn.com/schema";
const ALREADY_THERE = /^(react|react-dom|next)(\/|$)|^@nebutra\//;

function thirdPartyDependencies(source: string): string[] {
  const packages = new Set<string>();
  for (const m of source.matchAll(/\bfrom\s+["']([^"'./][^"']*)["']/g)) {
    const spec = m[1] as string;
    if (ALREADY_THERE.test(spec)) continue;
    const parts = spec.split("/");
    packages.add(spec.startsWith("@") ? `${parts[0]}/${parts[1]}` : (parts[0] as string));
  }
  return [...packages].sort();
}

export function registryItem(demoId: string) {
  const source = DEMO_SOURCES[demoId];
  const entry = entryForDemo(demoId);
  if (!source || !entry) return null;
  const dependencies = thirdPartyDependencies(source);
  return {
    $schema: `${SCHEMA}/registry-item.json`,
    name: demoId,
    type: "registry:example",
    title: entry.title,
    description: `${entry.title} — imported from ${entry.import}.`,
    categories: [entry.category],
    ...(dependencies.length > 0 ? { dependencies } : {}),
    files: [
      {
        path: `examples/${demoId}.tsx`,
        type: "registry:example",
        target: `components/examples/${demoId}.tsx`,
        content: source,
      },
    ],
  };
}

export function registryIndex(homepage: string) {
  const category = new Map(CATALOG_CATEGORIES.map((c) => [c.id, c.title]));
  return {
    $schema: `${SCHEMA}/registry.json`,
    name: "nebutra",
    homepage,
    items: CATALOG.flatMap((entry) =>
      entry.demos.map((demo) => ({
        name: demo,
        type: "registry:example",
        title: entry.title,
        description: `${entry.title} (${category.get(entry.category)}, ${entry.status})`,
        categories: [entry.category],
      })),
    ),
  };
}

/** The demo's source, for Studio's code view. */
export function demoSource(demoId: string): string | undefined {
  return DEMO_SOURCES[demoId];
}

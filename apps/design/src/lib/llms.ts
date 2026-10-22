import { brand } from "@nebutra/brand/metadata";
import { CATALOG, CATALOG_CATEGORIES } from "@nebutra/ui/catalog";
import { COMPONENTS, componentsInGroup, GROUPS } from "@/lib/components/registry";
import { ECOSYSTEM, STATUS_LABEL } from "@/lib/ecosystem";
import { navSections } from "@/lib/nav";
import { NAV_GROUPS } from "@/lib/nav-groups";
import {
  NPM_CREATE_SAILOR_URL,
  NPM_UI_URL,
  REGISTRY_URL,
  SITE_NAME,
  SITE_ORIGIN,
  STUDIO_URL,
} from "@/lib/site";

/**
 * The machine-readable index of the site, in the llms.txt shape: a title, a
 * one-line summary, then sections of `[name](url): note` links.
 *
 * It is assembled from the data the site already renders from — the same
 * navigation tree as the sidebar, the same component registry as the pages,
 * the same catalog as Studio and the registry — so a page that gains a sidebar
 * entry joins this index on the next build and nobody edits two lists.
 *
 * Every URL is absolute (an agent reading this has no page to resolve against),
 * and a planned ecosystem item is listed without a link: there is nothing to
 * fetch, and saying so is the point.
 */

const absolute = (href: string) => (href.startsWith("/") ? `${SITE_ORIGIN}${href}` : href);

function link(label: string, href: string, note?: string): string {
  return `- [${label}](${absolute(href)})${note ? `: ${note}` : ""}`;
}

function pageLines(groupId: string): string[] {
  return (
    navSections()
      .filter((section) => section.group === groupId && section.level !== 2)
      // Component pages are listed with their blurbs under "Components".
      .filter((section) => !section.items.every((item) => item.href.startsWith("/components/")))
      .flatMap((section) => section.items.map((item) => ({ item, section: section.label })))
      // The section names what an ambiguous label ("Overview") is an overview of.
      .map(({ item, section }) => link(item.label, item.href, section))
  );
}

export function buildLlmsTxt(): string {
  const out: string[] = [];

  out.push(`# ${SITE_NAME}`, "");
  out.push(
    `> The ${brand.name} design system as a product: design tokens, ${COMPONENTS.length} documented React components, patterns and ${CATALOG.length} catalog components, all rendered from the packages you install.`,
    "",
  );
  out.push(
    "Every page on this site is rendered from the source of the package it documents; counts are measured at build time. Statuses below are stated plainly: a planned item is not built.",
    "",
  );

  out.push("## Use it", "");
  out.push("- Install: `pnpm add @nebutra/ui`");
  out.push(
    "- Scaffold an app in a chosen look: `npx create-sailor@latest my-app --preset <language-or-code>`",
  );
  for (const group of GROUPS) {
    out.push(`- \`${group.importPath}\`: ${group.note}`);
  }
  out.push("");

  for (const group of NAV_GROUPS) {
    out.push(`## ${group.label}`, "", group.blurb, "");
    out.push(...pageLines(group.id), "");
  }

  out.push(`## Components (${COMPONENTS.length})`, "");
  for (const group of GROUPS) {
    out.push(`### ${group.label}`, "", `Import from \`${group.importPath}\`.`, "");
    for (const entry of componentsInGroup(group.id)) {
      out.push(link(entry.name, `/components/${entry.slug}`, entry.blurb));
    }
    out.push("");
  }

  out.push("## Ecosystem", "");
  for (const item of ECOSYSTEM) {
    const where = item.href ? ` — [link](${absolute(item.href)})` : "";
    out.push(
      `- **${item.name}** (${STATUS_LABEL[item.status].toLowerCase()}): ${item.summary}${where}`,
    );
  }
  out.push("");

  out.push("## Machine-readable", "");
  out.push(link("This index", "/llms.txt"));
  out.push(
    link(
      "Component registry (shadcn format)",
      REGISTRY_URL,
      "every catalog demo as an installable example",
    ),
  );
  out.push(link("Sailor Studio", STUDIO_URL, "choose a look and take it as a preset code"));
  out.push(link("@nebutra/ui on npm", NPM_UI_URL));
  out.push(link("create-sailor on npm", NPM_CREATE_SAILOR_URL));
  out.push(link("Source", brand.social.github));
  out.push("");

  out.push("## Optional", "");
  out.push(
    `The full catalog (${CATALOG.length} components) by category. Names only; use the registry for source.`,
    "",
  );
  for (const category of CATALOG_CATEGORIES) {
    const entries = CATALOG.filter((entry) => entry.category === category.id);
    if (entries.length === 0) continue;
    const names = entries
      .map((entry) =>
        entry.status === "experimental" ? `${entry.title} (experimental)` : entry.title,
      )
      .join(", ");
    out.push(`- ${category.title}: ${names}`);
  }
  out.push("");

  return out.join("\n");
}

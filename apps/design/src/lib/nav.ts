import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { CommandEntry } from "@/components/command-palette";
import type { NavSection } from "@/components/site-nav";
import { componentsInGroup, GROUPS } from "@/lib/components/registry";
import { NAV_GROUPS, type NavGroupId } from "@/lib/nav-groups";
import { PATTERNS } from "@/lib/pattern-data";
import { showcaseDemos } from "@/lib/showcase";
import { NPM_UI_URL, REGISTRY_URL, STUDIO_URL } from "@/lib/site";

/**
 * The sidebar tree, derived rather than typed out.
 *
 * The site has four top-level groups (see `nav-groups.ts`) and the rail shows
 * the pages of the group you are in. What is hand-written is the editorial
 * part: which hub and foundation pages exist. Every component entry comes from
 * the registry, so a component that gains a page joins the sidebar on the next
 * build and one that loses its page leaves it. That is the property that keeps
 * a ninety-item index honest: nobody has to remember to update it.
 */

const DESIGN: NavSection[] = [
  {
    id: "design",
    group: "design",
    label: "Design",
    items: [
      {
        href: "/design",
        label: "Principles",
        keywords: "design hub overview resources guidelines",
      },
    ],
  },
  {
    id: "foundations",
    group: "design",
    label: "Foundations",
    items: [
      { href: "/tokens", label: "Overview", keywords: "foundations tokens" },
      { href: "/tokens/color", label: "Color" },
      { href: "/tokens/type", label: "Type", keywords: "typography fonts" },
      { href: "/tokens/shape", label: "Shape", keywords: "radius" },
      { href: "/tokens/elevation", label: "Elevation", keywords: "shadow" },
      { href: "/tokens/motion", label: "Motion", keywords: "animation duration easing" },
      { href: "/tokens/layers", label: "Layers", keywords: "z-index stacking" },
      { href: "/tokens/switchability", label: "Switchability", keywords: "design language skin" },
      { href: "/tokens/traps", label: "Traps" },
      { href: "/accessibility", label: "Accessibility", keywords: "a11y contrast" },
      { href: "/copywriting", label: "Copywriting", keywords: "microcopy voice" },
    ],
  },
  {
    // Composition decisions — hand-written, with the cast verified at build time.
    id: "patterns-nav",
    group: "design",
    label: "Patterns",
    meta: String(PATTERNS.length),
    items: PATTERNS.map((pattern) => ({
      href: `/patterns/${pattern.slug}`,
      label: pattern.title,
    })),
  },
];

const ECOSYSTEM: NavSection[] = [
  {
    id: "ecosystem",
    group: "ecosystem",
    label: "Ecosystem",
    items: [
      {
        href: "/ecosystem",
        label: "Overview",
        keywords: "ecosystem tools status figma code connect mcp",
      },
      { href: "/palette", label: "Palette", keywords: "color generator scale" },
      { href: "/motion-lab", label: "Motion Lab", keywords: "animation easing spring behavior" },
      { href: "/icons", label: "IconBox", keywords: "icons glyphs" },
      { href: STUDIO_URL, label: "Sailor Studio", kind: "external" },
    ],
  },
];

const RESOURCES: NavSection[] = [
  {
    id: "brand",
    group: "resources",
    label: "Brand",
    // The identity, rendered from the @nebutra/brand SSOT rather than described.
    items: [{ href: "/brand", label: "Visual identity", keywords: "logo mark wordmark assets" }],
  },
  {
    id: "machines",
    group: "resources",
    label: "For machines and agents",
    items: [
      { href: "/llms.txt", label: "llms.txt", kind: "file" },
      { href: REGISTRY_URL, label: "Component registry", kind: "external" },
    ],
  },
  {
    id: "source",
    group: "resources",
    label: "Source",
    items: [
      { href: brand.social.github, label: "GitHub", kind: "external" },
      { href: NPM_UI_URL, label: "@nebutra/ui on npm", kind: "external" },
      { href: getBrandOrigin("status"), label: "Status", kind: "external" },
    ],
  },
];

/** The site map, shown where no group applies (the menu on the home page). */
const MAP: NavSection[] = [
  {
    id: "map-design",
    group: "map",
    label: "Design",
    items: [
      { href: "/design", label: "Principles" },
      { href: "/tokens", label: "Foundations" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
  {
    id: "map-develop",
    group: "map",
    label: "Develop",
    items: [
      { href: "/develop", label: "Getting started" },
      { href: "/components", label: "Components" },
      { href: "/showcase", label: "Showcase" },
      { href: "/adoption", label: "Adoption" },
    ],
  },
  {
    id: "map-ecosystem",
    group: "map",
    label: "Ecosystem",
    items: [
      { href: "/ecosystem", label: "Overview" },
      { href: "/palette", label: "Palette" },
      { href: "/motion-lab", label: "Motion Lab" },
      { href: "/icons", label: "IconBox" },
    ],
  },
  {
    id: "map-resources",
    group: "map",
    label: "Resources",
    items: [
      { href: "/brand", label: "Brand" },
      { href: "/llms.txt", label: "llms.txt", kind: "file" },
    ],
  },
];

function developSections(): NavSection[] {
  const groups = GROUPS.map(
    (group) =>
      ({
        id: group.id,
        group: "develop",
        label: group.label,
        level: 2,
        meta: String(componentsInGroup(group.id).length),
        items: componentsInGroup(group.id).map((entry) => ({
          href: `/components/${entry.slug}`,
          label: entry.name,
        })),
      }) satisfies NavSection,
  ).filter((section) => section.items.length > 0);

  return [
    {
      id: "develop",
      group: "develop",
      label: "Develop",
      items: [
        {
          href: "/develop",
          label: "Getting started",
          keywords: "develop install usage packages layers engineering",
        },
        { href: "/components", label: "All components", keywords: "library catalog" },
        { href: "/showcase", label: "Showcase", keywords: "blocks demos gallery expressive" },
        { href: "/adoption", label: "Adoption", keywords: "usage metrics coverage" },
      ],
    },
    ...groups,
  ];
}

export function navSections(): NavSection[] {
  return [...DESIGN, ...developSections(), ...ECOSYSTEM, ...RESOURCES, ...MAP];
}

/**
 * The palette index: every page in the sidebar, plus the showcase demos.
 *
 * Derived from the same call the sidebar renders, so the two cannot disagree —
 * nothing is searchable that is not reachable, and nothing reachable is missing.
 * The showcase demos are added separately because they live on one page rather
 * than one page each, and a hundred and sixty of them in the sidebar would bury
 * everything else. Files and off-site links are in, flagged `external` so the
 * palette leaves the app router for them; the map repeats pages the groups
 * already list, so it stays out.
 */
export function commandEntries(): CommandEntry[] {
  const labels = new Map<NavGroupId, string>(NAV_GROUPS.map((group) => [group.id, group.label]));
  const seen = new Set<string>();
  const fromNav: CommandEntry[] = [];

  for (const section of navSections()) {
    if (section.group === "map") continue;
    const groupLabel = labels.get(section.group) ?? section.label;
    for (const item of section.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      fromNav.push({
        href: item.href,
        label: item.label,
        group: section.label === groupLabel ? groupLabel : `${groupLabel} · ${section.label}`,
        ...(item.keywords ? { keywords: item.keywords } : {}),
        ...(item.kind ? { external: true } : {}),
      });
    }
  }

  const fromShowcase = showcaseDemos().map((demo) => ({
    href: "/showcase",
    label: demo.label,
    group: "Develop · Showcase",
    demo: true,
  }));

  return [...fromNav, ...fromShowcase];
}

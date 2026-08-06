import type { CommandEntry } from "@/components/command-palette";
import type { NavSection } from "@/components/site-nav";
import { componentsInGroup, GROUPS } from "@/lib/components/registry";
import { PATTERNS } from "@/lib/pattern-data";
import { showcaseDemos } from "@/lib/showcase";

/**
 * The sidebar tree, derived rather than typed out.
 *
 * The foundation pages are a real editorial list — there is no source to read
 * them from, and inventing one would be worse than writing nine lines. Every
 * component entry below comes from the registry, so a component that gains a
 * page joins the sidebar on the next build and one that loses its page leaves
 * it. That is the property that keeps a ninety-item index honest: nobody has to
 * remember to update it.
 */
const FOUNDATIONS: NavSection = {
  id: "foundations",
  label: "Foundations",
  items: [
    { href: "/tokens", label: "Overview" },
    { href: "/tokens/color", label: "Color" },
    { href: "/tokens/type", label: "Type" },
    { href: "/tokens/shape", label: "Shape" },
    { href: "/tokens/elevation", label: "Elevation" },
    { href: "/tokens/motion", label: "Motion" },
    { href: "/tokens/layers", label: "Layers" },
    { href: "/tokens/switchability", label: "Switchability" },
    { href: "/tokens/traps", label: "Traps" },
    { href: "/icons", label: "Icons" },
    { href: "/accessibility", label: "Accessibility" },
  ],
};

/** Composition decisions — hand-written, with the cast verified at build time. */
const PATTERN_NAV: NavSection = {
  id: "patterns-nav",
  label: "Patterns",
  meta: String(PATTERNS.length),
  items: PATTERNS.map((pattern) => ({
    href: `/patterns/${pattern.slug}`,
    label: pattern.title,
  })),
};

/** The identity, rendered from the @nebutra/brand SSOT rather than described. */
const BRAND: NavSection = {
  id: "brand",
  label: "Brand",
  items: [{ href: "/brand", label: "Visual identity" }],
};

export function navSections(): NavSection[] {
  const groups = GROUPS.map(
    (group) =>
      ({
        id: group.id,
        label: group.label,
        meta: String(componentsInGroup(group.id).length),
        items: componentsInGroup(group.id).map((entry) => ({
          href: `/components/${entry.slug}`,
          label: entry.name,
        })),
      }) satisfies NavSection,
  ).filter((section) => section.items.length > 0);

  return [
    BRAND,
    FOUNDATIONS,
    PATTERN_NAV,
    {
      id: "components-index",
      label: "Components",
      items: [
        { href: "/components", label: "All components" },
        { href: "/showcase", label: "Showcase" },
      ],
    },
    ...groups,
  ];
}

/**
 * The palette index: every sidebar entry, plus the showcase demos.
 *
 * Derived from the same call the sidebar renders, so the two cannot disagree —
 * nothing is searchable that is not reachable, and nothing reachable is missing.
 * The showcase demos are added separately because they live on one page rather
 * than one page each, and a hundred and sixty of them in the sidebar would bury
 * everything else.
 */
export function commandEntries(): CommandEntry[] {
  const fromNav = navSections().flatMap((section) =>
    section.items.map((item) => ({
      href: item.href,
      label: item.label,
      group: section.label,
    })),
  );

  const fromShowcase = showcaseDemos().map((demo) => ({
    href: "/showcase",
    label: demo.label,
    group: "Showcase",
  }));

  return [...fromNav, ...fromShowcase];
}

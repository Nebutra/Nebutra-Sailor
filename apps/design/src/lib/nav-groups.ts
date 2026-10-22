/**
 * The four top-level groups of the site, as plain data.
 *
 * Kept free of imports on purpose: the header, the rail and the mobile sheet
 * are client components, and the derived tree in `nav.ts` reads the component
 * registry off disk. This file is the part of the navigation both sides can
 * share — which group a URL belongs to, and where each group's tab points.
 *
 * Every route belongs to one group, so the rail can show that group's pages and
 * the header can mark its tab. A route that matches no prefix (the home page,
 * the 404) belongs to none, and the rail shows the site map instead.
 */

export type NavGroupId = "design" | "develop" | "ecosystem" | "resources";

export interface NavGroup {
  id: NavGroupId;
  label: string;
  /** Where the tab goes — a route the group owns. */
  href: string;
  /** One line on who the group is for; shown in the map and the footer. */
  blurb: string;
  /** Path prefixes that belong to the group, matched on whole segments. */
  prefixes: readonly string[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "design",
    label: "Design",
    href: "/design",
    blurb: "Principles, tokens and the patterns that decide how a screen is put together.",
    prefixes: ["/design", "/tokens", "/patterns", "/accessibility", "/copywriting"],
  },
  {
    id: "develop",
    label: "Develop",
    href: "/develop",
    blurb: "Install it, import it, and look up any component and its states.",
    prefixes: ["/develop", "/components", "/showcase", "/adoption"],
  },
  {
    id: "ecosystem",
    label: "Ecosystem",
    href: "/ecosystem",
    blurb: "The tools around the library — each marked live, beta or planned.",
    prefixes: ["/ecosystem", "/palette", "/motion-lab", "/icons"],
  },
  {
    id: "resources",
    label: "Resources",
    href: "/brand",
    blurb: "Brand assets and the machine-readable index of the site.",
    prefixes: ["/brand"],
  },
];

/** The group a URL belongs to, or null for the home page and unknown routes. */
export function groupForPath(pathname: string): NavGroup | null {
  const path = (pathname.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";
  return (
    NAV_GROUPS.find((group) =>
      group.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    ) ?? null
  );
}

// @brand-exempt: design-system documentation copy; it names the product in prose and carries no brand colour or domain literal.
import { NPM_UI_URL, REGISTRY_URL, STUDIO_URL } from "@/lib/site";

/**
 * What surrounds the library, and how finished each piece is.
 *
 * This list is editorial and the statuses are claims, so each one carries the
 * reason it holds. The rule for editing it: a piece is `live` only if a person
 * can use it today from the link given; `beta` if it exists and is changing;
 * `planned` if nothing of it ships yet. A planned item has no link on purpose —
 * there is nothing to link to, and a placeholder would read as a promise.
 */

export type EcosystemStatus = "live" | "beta" | "planned";

export type Audience = "design" | "develop" | "agent";

export interface EcosystemItem {
  id: string;
  name: string;
  audience: readonly Audience[];
  status: EcosystemStatus;
  /** What it does for the person using it, in a sentence. */
  summary: string;
  /** Why the status is what it is. */
  basis: string;
  /** Absent for planned items. */
  href?: string;
  external?: boolean;
}

export const STATUS_LABEL: Record<EcosystemStatus, string> = {
  live: "Live",
  beta: "Beta",
  planned: "Planned",
};

export const ECOSYSTEM: readonly EcosystemItem[] = [
  {
    id: "ui",
    name: "@nebutra/ui",
    audience: ["develop"],
    status: "live",
    summary:
      "The component library: primitives, composed components, patterns and layouts, themed by tokens.",
    basis: "Published on npm; every component page on this site renders from its source.",
    href: NPM_UI_URL,
    external: true,
  },
  {
    id: "studio",
    name: "Sailor Studio",
    audience: ["design", "develop"],
    status: "live",
    summary:
      "Pick a design language, brand colour, radius and fonts, review them on real components, and take the result as one preset code.",
    basis:
      "Served from the Nebutra site; the same preset is read by create-sailor and the nebutra CLI.",
    href: STUDIO_URL,
    external: true,
  },
  {
    id: "registry",
    name: "Component registry",
    audience: ["develop", "agent"],
    status: "live",
    summary:
      "Every catalog demo as a shadcn-format registry item, so a tool can fetch an example instead of guessing it.",
    basis: "Served as JSON from the Nebutra site; generated from the same catalog as Studio.",
    href: REGISTRY_URL,
    external: true,
  },
  {
    id: "icons",
    name: "IconBox",
    audience: ["design", "develop"],
    status: "live",
    summary: "Search every icon in @nebutra/icons and copy its name, import or JSX.",
    basis: "A page of this site, counted from the package's exports.",
    href: "/icons",
  },
  {
    id: "palette",
    name: "Palette",
    audience: ["design"],
    status: "beta",
    summary: "Work out a colour scale from a brand colour and see how its steps pair.",
    basis: "New on this site and still changing.",
    href: "/palette",
  },
  {
    id: "motion-lab",
    name: "Motion Lab",
    audience: ["design", "develop"],
    status: "beta",
    summary:
      "Run the motion tokens as behaviour — durations, easings and presets on live elements — not as a table of values.",
    basis: "New on this site and still changing.",
    href: "/motion-lab",
  },
  {
    id: "blocks",
    name: "Showcase and Blocks",
    audience: ["design", "develop"],
    status: "beta",
    summary:
      "Components and larger blocks at the size they render in a product, grouped by how much a product leans on them.",
    basis: "The showcase exists; its block tier is being filled in.",
    href: "/showcase",
  },
  {
    id: "adoption",
    name: "Adoption",
    audience: ["develop"],
    status: "beta",
    summary:
      "Which components the Nebutra products actually use, so you can tell what is settled from what is only offered.",
    basis: "New on this site and still changing.",
    href: "/adoption",
  },
  {
    id: "skill",
    name: "Agent skills",
    audience: ["agent"],
    status: "beta",
    summary:
      "Skills that teach a coding agent to scaffold a Sailor project and to set its look through Studio.",
    basis: "Shipped in the repository; install and behaviour are still evolving.",
  },
  {
    id: "llms",
    name: "llms.txt",
    audience: ["agent"],
    status: "live",
    summary:
      "One plain-text index of this site: components, token pages, guides and machine-readable endpoints.",
    basis: "Generated at build time from the same data as the sidebar.",
    href: "/llms.txt",
  },
  {
    id: "mcp",
    name: "Design-system MCP server",
    audience: ["agent"],
    status: "planned",
    summary:
      "Let an agent look up a component, its props and the current tokens without scraping pages.",
    basis:
      "The @nebutra/mcp package exists as MCP plumbing, but no design-system server is built on it.",
  },
  {
    id: "figma",
    name: "Figma library",
    audience: ["design"],
    status: "planned",
    summary: "The tokens and components as a Figma library that stays in step with the code.",
    basis: "Not started: there is no Figma file or sync yet.",
  },
  {
    id: "code-connect",
    name: "Figma Code Connect",
    audience: ["design", "develop"],
    status: "planned",
    summary: "Show the real import and props in Figma's Dev Mode beside each component.",
    basis: "Not started; it depends on the Figma library.",
  },
];

export function ecosystemItem(id: string): EcosystemItem {
  const item = ECOSYSTEM.find((entry) => entry.id === id);
  if (!item) throw new Error(`[apps/design] unknown ecosystem item "${id}"`);
  return item;
}

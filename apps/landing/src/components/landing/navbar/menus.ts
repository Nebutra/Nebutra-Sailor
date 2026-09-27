import { getGroupResources, RESOURCE_GROUPS_HERE } from "@/lib/constants/resources-data";
import { getGroupSolutions, SOLUTION_GROUPS } from "@/lib/constants/solutions-data";
import type { Menu, MenuId } from "./menu-types";
import { ResourcesMegaMenu } from "./ResourcesMegaMenu";
import { SolutionsMegaMenu } from "./SolutionsMegaMenu";

/**
 * The navbar's menus. The template's copy (menus.for-template.ts) registers
 * Resources only, so the Solutions menu — and the investor data behind it —
 * is never imported there, not merely hidden.
 */
export const MENUS: Partial<Record<MenuId, Menu>> = {
  resources: {
    Desktop: ResourcesMegaMenu,
    groups: () =>
      RESOURCE_GROUPS_HERE.map((group) => ({
        id: group.id,
        label: group.label,
        items: getGroupResources(group).map((resource) => ({
          key: resource.href,
          href: resource.href,
          external: resource.external ?? false,
          icon: resource.icon,
          label: resource.label,
        })),
      })),
  },
  solutions: {
    Desktop: SolutionsMegaMenu,
    groups: () =>
      SOLUTION_GROUPS.map((group) => ({
        id: group.id,
        label: group.label,
        items: getGroupSolutions(group).map((s) => ({
          key: s.slug,
          href: `/solutions/${s.slug}`,
          external: false,
          icon: s.icon,
          label: s.label,
        })),
      })),
  },
};

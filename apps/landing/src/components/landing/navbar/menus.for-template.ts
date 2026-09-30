import { getGroupResources, RESOURCE_GROUPS_HERE } from "@/lib/constants/resources-data";
import type { Menu, MenuId } from "./menu-types";
import { ResourcesMegaMenu } from "./ResourcesMegaMenu";

/** The template's navbar menus. See menus.ts; template-build puts this in its place. */
export const MENUS: Partial<Record<MenuId, Menu>> = {
  resources: {
    Desktop: ResourcesMegaMenu,
    groups: () =>
      RESOURCE_GROUPS_HERE.map((group) => ({
        id: group.id,
        items: getGroupResources(group).map((resource) => ({
          key: resource.id,
          href: resource.href,
          external: resource.external ?? false,
          icon: resource.icon,
        })),
      })),
  },
};

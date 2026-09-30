import type { ComponentType } from "react";

/** A navbar item that opens a menu instead of linking a page. */
export type MenuId = "resources" | "solutions";

/**
 * Structure only — no copy. `id` (group) and `key` (item) are translation
 * keys into the `resourcesCatalog` / `solutionsNav` message namespaces,
 * looked up by the menu-owning namespace (see `MobileDrawer.tsx`).
 */
export interface MenuGroup {
  id: string;
  items: {
    key: string;
    href: string;
    external: boolean;
    icon: ComponentType<{ className?: string }>;
  }[];
}

export interface Menu {
  /** The desktop trigger and its panel. */
  Desktop: ComponentType;
  /** The same links as groups, for the mobile drawer. */
  groups: () => MenuGroup[];
}

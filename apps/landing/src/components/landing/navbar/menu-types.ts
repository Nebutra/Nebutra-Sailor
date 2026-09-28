import type { ComponentType } from "react";
import type { LocalizedCopy } from "@/lib/i18n/localized";

/** A navbar item that opens a menu instead of linking a page. */
export type MenuId = "resources" | "solutions";

export interface MenuGroup {
  id: string;
  label: LocalizedCopy;
  items: {
    key: string;
    href: string;
    external: boolean;
    icon: ComponentType<{ className?: string }>;
    label: LocalizedCopy;
  }[];
}

export interface Menu {
  /** The desktop trigger and its panel. */
  Desktop: ComponentType;
  /** The same links as groups, for the mobile drawer. */
  groups: () => MenuGroup[];
}

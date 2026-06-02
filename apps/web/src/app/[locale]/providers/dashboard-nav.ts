import { routing } from "@nebutra/i18n/routing";
import {
  CreditCard,
  Home as HomeIcon,
  Lightning,
  Logs,
  type Icon as LucideIcon,
  BlendMode as Palette,
  Connection as Plug,
  Shield,
  Users,
} from "@nebutra/icons";

export interface DashboardNavBadge {
  label: string;
  tone: "beta" | "new" | "owner" | "featured" | "coming-soon";
}

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Product" | "Operations" | "Admin";
  badge?: DashboardNavBadge;
  children?: DashboardNavItem[];
}

export interface DashboardNavCapabilities {
  readonly startupAgentOS?: boolean;
}

const STARTUP_OS_NAV_ITEM: DashboardNavItem = {
  href: "/startup-os",
  label: "Startup OS",
  icon: Lightning,
  group: "Product",
  badge: { label: "Alpha", tone: "beta" },
};

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { href: "/workspace", label: "Home", icon: HomeIcon, group: "Product" },
  STARTUP_OS_NAV_ITEM,
  {
    href: "/theme-playground",
    label: "Theme Playground",
    icon: Palette,
    group: "Product",
    badge: { label: "Beta", tone: "beta" },
  },
  { href: "/integrations", label: "Connectors", icon: Plug, group: "Product" },
  { href: "/billing", label: "Billing", icon: CreditCard, group: "Operations" },
  { href: "/tenants", label: "Tenants", icon: Users, group: "Operations" },
  { href: "/audit", label: "Audit", icon: Logs, group: "Operations" },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    group: "Admin",
    badge: { label: "Owner", tone: "owner" },
  },
];

export function getDashboardNavItems(capabilities?: DashboardNavCapabilities) {
  return capabilities?.startupAgentOS === false
    ? DASHBOARD_NAV_ITEMS.filter((item) => item.href !== STARTUP_OS_NAV_ITEM.href)
    : DASHBOARD_NAV_ITEMS;
}

export function getDashboardNavGroups(capabilities?: DashboardNavCapabilities) {
  const items = getDashboardNavItems(capabilities);
  return [
    {
      title: "Product",
      items: items.filter((item) => item.group === "Product"),
    },
    {
      title: "Operations",
      items: items.filter((item) => item.group === "Operations"),
    },
    {
      title: "Admin",
      items: items.filter((item) => item.group === "Admin"),
    },
  ];
}

export const DASHBOARD_NAV_GROUPS = getDashboardNavGroups();

export const WORKSPACES = [
  { id: "starter", label: "Starter Workspace" },
  { id: "growth", label: "Growth Workspace" },
  { id: "enterprise", label: "Enterprise Workspace" },
] as const;

export type WorkspaceId = (typeof WORKSPACES)[number]["id"];

export function isWorkspaceId(value: string): value is WorkspaceId {
  return WORKSPACES.some((item) => item.id === value);
}

const LOCALE_PREFIXES = new Set<string>(routing.locales);

export function stripLocalePrefix(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const [firstSegment, ...restSegments] = segments;

  if (firstSegment && LOCALE_PREFIXES.has(firstSegment)) {
    return restSegments.length > 0 ? `/${restSegments.join("/")}` : "/";
  }

  return pathname || "/";
}

export function isActiveRoute(pathname: string, href: string) {
  const normalizedPathname = stripLocalePrefix(pathname);
  if (href === "/") return normalizedPathname === "/";
  return normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);
}

function formatSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildBreadcrumbs(pathname: string, capabilities?: DashboardNavCapabilities) {
  const segments = stripLocalePrefix(pathname).split("/").filter(Boolean);
  const navItems = getDashboardNavItems(capabilities);
  const crumbs: Array<{ href: string; label: string }> = [];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const navItem = navItems.find((item) => item.href === href);
    crumbs.push({
      href,
      label: navItem?.label ?? formatSegment(segment),
    });
  });

  return crumbs;
}

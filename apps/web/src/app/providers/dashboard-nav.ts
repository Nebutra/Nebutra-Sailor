import { routing } from "@nebutra/i18n/routing";
import {
  ChartActivity,
  CreditCard,
  Key,
  Lightning,
  type Icon as LucideIcon,
  Connection as Plug,
  Servers,
  SettingsGear,
  Shield,
  Users,
  Webhook,
} from "@nebutra/icons";

export interface DashboardNavBadge {
  label: string;
  tone: "beta" | "new" | "owner" | "featured" | "coming-soon";
}

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: DashboardNavGroupTitle;
  badge?: DashboardNavBadge;
  children?: DashboardNavItem[];
}

/**
 * Build = what the product makes; Developers = the integration surface (keys,
 * webhooks, model providers), promoted out of Settings so the rail reads as an
 * app; Workspace = metering, money and configuration; Admin = owner-only.
 */
export type DashboardNavGroupTitle = "Build" | "Developer tools" | "Workspace" | "Admin";

export interface DashboardNavCapabilities {
  readonly startupAgentOS?: boolean;
}

const STARTUP_OS_NAV_ITEM: DashboardNavItem = {
  href: "/startup-os",
  label: "Startup OS",
  icon: Lightning,
  group: "Build",
  badge: { label: "Alpha", tone: "beta" },
};

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  STARTUP_OS_NAV_ITEM,
  { href: "/integrations", label: "Connectors", icon: Plug, group: "Build" },
  { href: "/cofounder", label: "Match your cofounder", icon: Users, group: "Build" },
  { href: "/settings/api-keys", label: "Api Keys", icon: Key, group: "Developer tools" },
  { href: "/settings/webhooks", label: "Webhooks", icon: Webhook, group: "Developer tools" },
  {
    href: "/settings/provider-keys",
    label: "Provider Keys",
    icon: Servers,
    group: "Developer tools",
  },
  { href: "/usage", label: "Usage", icon: ChartActivity, group: "Workspace" },
  { href: "/billing", label: "Billing", icon: CreditCard, group: "Workspace" },
  { href: "/settings", label: "Settings", icon: SettingsGear, group: "Workspace" },
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
  const titles: DashboardNavGroupTitle[] = ["Build", "Developer tools", "Workspace", "Admin"];
  return titles.map((title) => ({
    title,
    items: items.filter((item) => item.group === title),
  }));
}

export const DASHBOARD_NAV_GROUPS = getDashboardNavGroups();

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

/**
 * The one nav href that owns `pathname`: the longest matching prefix, so
 * `/settings/api-keys` lights "API keys" and not "Settings" as well (two
 * active rows would also fight over the travelling selection surface).
 */
export function resolveActiveHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (isActiveRoute(pathname, href) && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
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

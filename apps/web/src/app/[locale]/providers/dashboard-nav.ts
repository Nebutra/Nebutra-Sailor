import {
  ChartSpline,
  CreditCard,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Users,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Product" | "Operations";
}

export const DASHBOARD_NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, group: "Product" },
  { href: "/analytics", label: "Analytics", icon: ChartSpline, group: "Product" },
  { href: "/billing", label: "Billing", icon: CreditCard, group: "Operations" },
  { href: "/tenants", label: "Tenants", icon: Users, group: "Operations" },
  { href: "/audit", label: "Audit", icon: FileText, group: "Operations" },
] as const satisfies readonly DashboardNavItem[];

export const DASHBOARD_NAV_GROUPS = [
  {
    title: "Product",
    items: DASHBOARD_NAV_ITEMS.filter((item) => item.group === "Product"),
  },
  {
    title: "Operations",
    items: DASHBOARD_NAV_ITEMS.filter((item) => item.group === "Operations"),
  },
] as const;

export const WORKSPACES = [
  { id: "starter", label: "Starter Workspace" },
  { id: "growth", label: "Growth Workspace" },
  { id: "enterprise", label: "Enterprise Workspace" },
] as const;

export type WorkspaceId = (typeof WORKSPACES)[number]["id"];

export function isWorkspaceId(value: string): value is WorkspaceId {
  return WORKSPACES.some((item) => item.id === value);
}

export function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildBreadcrumbs(pathname: string) {
  if (pathname === "/") {
    return [{ href: "/", label: "Overview" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ href: "/", label: "Overview" }];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const navItem = DASHBOARD_NAV_ITEMS.find((item) => item.href === href);
    crumbs.push({
      href,
      label: navItem?.label ?? formatSegment(segment),
    });
  });

  return crumbs;
}

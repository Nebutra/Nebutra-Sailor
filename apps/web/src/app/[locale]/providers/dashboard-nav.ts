import {
  Bot,
  Building2,
  ChartSpline,
  CreditCard,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Product" | "Operations" | "Admin";
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, group: "Product" },
  { href: "/analytics", label: "Analytics", icon: ChartSpline, group: "Product" },
  { href: "/chat", label: "AI Chat", icon: Bot, group: "Product" },
  { href: "/billing", label: "Billing", icon: CreditCard, group: "Operations" },
  { href: "/tenants", label: "Tenants", icon: Users, group: "Operations" },
  { href: "/audit", label: "Audit", icon: FileText, group: "Operations" },
  { href: "/admin", label: "Admin", icon: Shield, group: "Admin" },
  { href: "/admin/users", label: "Users", icon: UserCog, group: "Admin" },
  { href: "/admin/organizations", label: "Organizations", icon: Building2, group: "Admin" },
];

export const DASHBOARD_NAV_GROUPS = [
  {
    title: "Product",
    items: DASHBOARD_NAV_ITEMS.filter((item) => item.group === "Product"),
  },
  {
    title: "Operations",
    items: DASHBOARD_NAV_ITEMS.filter((item) => item.group === "Operations"),
  },
  {
    title: "Admin",
    items: DASHBOARD_NAV_ITEMS.filter((item) => item.group === "Admin"),
  },
];

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

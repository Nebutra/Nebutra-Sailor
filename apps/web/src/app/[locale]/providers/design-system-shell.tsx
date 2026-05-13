"use client";

// Use /client subpath — root entrypoint pulls server-only middleware.
import { isAuthFeatureEnabledSync, useAuth } from "@nebutra/auth/client";
import { AppShell } from "@nebutra/ui/layout";
import type { SidebarNavRenderLinkProps, SidebarNavSection, Workspace } from "@nebutra/ui/patterns";
import { SidebarNav, WorkspaceSwitcher } from "@nebutra/ui/patterns";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocaleSwitcher } from "@/components/navigation/locale-switcher";
import { OrgSwitcher } from "@/components/navigation/org-switcher";
import { SidebarProvider, useSidebar } from "@/components/navigation/sidebar-context";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { usePermission } from "@/hooks/usePermission";
import type { WebProductCapabilities } from "@/lib/product-capabilities";
import { resolvePreferredWorkspaceId } from "@/lib/workspace-selection";
import {
  buildBreadcrumbs,
  DASHBOARD_NAV_GROUPS,
  DASHBOARD_NAV_ITEMS,
  isActiveRoute,
  WORKSPACES,
} from "./dashboard-nav";

function HeaderAuthControls({
  supportsWorkspaceSwitching,
}: {
  supportsWorkspaceSwitching: boolean;
}) {
  const { isSignedIn } = useAuth();
  // Phase 2 dev rollout: gate the polished OrgSwitcher behind the
  // `organizations` auth feature flag. When off, the legacy native <select>
  // in the sidebar remains the only switcher (it still calls
  // /api/organizations/active correctly).
  const showOrgSwitcher = supportsWorkspaceSwitching && isAuthFeatureEnabledSync("organizations");

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {isSignedIn ? (
        <>
          {showOrgSwitcher && <OrgSwitcher />}
          <LocaleSwitcher />
          <UserMenu />
        </>
      ) : (
        <div className="flex gap-2">
          <a
            href="/sign-in"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 dark:text-white/70 dark:hover:bg-white/10"
          >
            Sign In
          </a>
          <a
            href="/sign-up"
            className="rounded-md bg-[image:var(--brand-gradient)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Sign Up
          </a>
        </div>
      )}
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  notificationCenter?: React.ReactNode;
  planBadge?: React.ReactNode;
  productCapabilities?: WebProductCapabilities;
}

interface WorkspaceOption {
  id: string;
  label: string;
}

export function DesignSystemShell(props: Props) {
  return (
    <SidebarProvider>
      <DesignSystemShellInner {...props} />
    </SidebarProvider>
  );
}

/**
 * Renders SidebarNav link items via Next.js <Link>.
 * Passed to <SidebarNav renderLink={...}> so the internal a11y / className
 * wiring is preserved while routing goes through the App Router.
 */
function renderNextLink({
  href,
  children,
  className,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
  onClick,
}: SidebarNavRenderLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function DesignSystemShellInner({
  children,
  notificationCenter,
  planBadge,
  productCapabilities,
}: Props) {
  const pathname = usePathname();
  const { isSignedIn, session } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const { can } = usePermission();
  const isAdmin = can("admin:access");
  const workspaceMode = productCapabilities?.workspace.mode ?? "organization";
  const supportsWorkspaceSwitching = workspaceMode === "organization";
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(
    WORKSPACES.map((workspace) => ({
      id: workspace.id,
      label: workspace.label,
    })),
  );
  const [workspace, setWorkspace] = useState<string>(WORKSPACES[0].id);
  const breadcrumbs = buildBreadcrumbs(pathname);
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  const currentWorkspaceLabel = useMemo(
    () =>
      supportsWorkspaceSwitching
        ? (workspaceOptions.find((item) => item.id === workspace)?.label ?? "Starter Workspace")
        : "Personal workspace",
    [supportsWorkspaceSwitching, workspace, workspaceOptions],
  );

  const fetchWorkspaces = useCallback(async () => {
    if (!isSignedIn || !supportsWorkspaceSwitching) return;

    try {
      const response = await fetch("/api/organizations", {
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        organizations?: Array<{ id: string; name: string; slug?: string | null }>;
      } | null;
      const organizations = Array.isArray(payload?.organizations) ? payload.organizations : [];

      if (organizations.length === 0) {
        return;
      }

      const options = organizations.map((organization) => ({
        id: organization.id,
        label: organization.name || organization.slug || "Untitled workspace",
      }));

      setWorkspaceOptions(options);

      const lastWorkspace =
        typeof window !== "undefined" ? window.localStorage.getItem("nebutra_active_org") : null;
      const preferredWorkspaceId = resolvePreferredWorkspaceId({
        options,
        sessionOrganizationId: session?.organizationId,
        storedOrganizationId: lastWorkspace,
      });

      if (preferredWorkspaceId) {
        setWorkspace(preferredWorkspaceId);
      }
    } catch {
      // Swallow — fallback workspace state remains usable.
    }
  }, [isSignedIn, session?.organizationId, supportsWorkspaceSwitching]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleWorkspaceChange = useCallback(async (nextWorkspaceId: string) => {
    setWorkspace(nextWorkspaceId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("nebutra_active_org", nextWorkspaceId);
    }

    try {
      const response = await fetch("/api/organizations/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: nextWorkspaceId }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch {
      // Keep optimistic state locally; the settings/select-org flows remain the fallback.
    }
  }, []);

  // ─── Map dashboard nav → SidebarNavSection[] ─────────────────────────────
  const sidebarSections = useMemo<SidebarNavSection[]>(() => {
    return DASHBOARD_NAV_GROUPS.filter((group) => group.title !== "Admin" || isAdmin).map(
      (group) => ({
        id: group.title,
        label: group.title,
        items: group.items.map((item) => ({
          id: item.href,
          label: item.label,
          href: item.href,
          icon: item.icon,
          badge: item.badge,
          isActive: isActiveRoute(pathname, item.href),
          children: item.children?.map((child) => ({
            id: child.href,
            label: child.label,
            href: child.href,
            icon: child.icon,
            badge: child.badge,
            isActive: isActiveRoute(pathname, child.href),
          })),
        })),
      }),
    );
  }, [isAdmin, pathname]);

  // ─── Workspaces mapped to WorkspaceSwitcher shape ────────────────────────
  const workspacesForSwitcher = useMemo<Workspace[]>(
    () =>
      workspaceOptions.map((option) => ({
        id: option.id,
        name: option.label,
      })),
    [workspaceOptions],
  );

  // ─── Sidebar header slot — logo + workspace switcher ─────────────────────
  const sidebarHeader = (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-start px-2"}`}>
        {collapsed ? (
          <span
            aria-label="Nebutra Sailor"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-sm font-semibold text-white"
          >
            N
          </span>
        ) : (
          <span className="text-lg font-semibold tracking-tight">Nebutra Sailor</span>
        )}
      </div>
      {supportsWorkspaceSwitching && workspacesForSwitcher.length > 0 && (
        <div className={collapsed ? "flex justify-center" : "px-2"}>
          <WorkspaceSwitcher
            workspaces={workspacesForSwitcher}
            activeWorkspaceId={workspace}
            onSwitch={handleWorkspaceChange}
            variant={collapsed ? "compact" : "expanded"}
            showRoleBadge={false}
          />
        </div>
      )}
    </div>
  );

  // ─── Sidebar footer slot — workspace mode info + theme toggle + collapse ─
  const sidebarFooter = (
    <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
      {!collapsed && (
        <div className="flex-1 truncate rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          Workspace: {currentWorkspaceLabel}
        </div>
      )}
      <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
        <ThemeToggle compact />
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  const sidebar = (
    <SidebarNav
      sections={sidebarSections}
      collapsed={collapsed}
      header={sidebarHeader}
      footer={sidebarFooter}
      renderLink={renderNextLink}
    />
  );

  // ─── Header slot — breadcrumbs + quick links + auth controls ─────────────
  const headerContent = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="hidden text-xs text-muted-foreground min-[360px]:block">Workspace</p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground sm:hidden">
          {currentBreadcrumb?.label ?? "Dashboard"}
        </p>
        <nav aria-label="Breadcrumb" className="mt-0.5 hidden sm:block">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                  {isLast ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <ViewTransitionLink
                      href={crumb.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </ViewTransitionLink>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="hidden gap-2 md:flex">
        {DASHBOARD_NAV_ITEMS.slice(0, 3).map((item) => (
          <ViewTransitionLink
            key={item.label}
            href={item.href}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </ViewTransitionLink>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {planBadge}
        {notificationCenter}
        <HeaderAuthControls supportsWorkspaceSwitching={supportsWorkspaceSwitching} />
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} header={headerContent} collapsed={collapsed}>
      <div id="main-content" aria-label="Main content" className="content-area">
        {children}
      </div>
    </AppShell>
  );
}

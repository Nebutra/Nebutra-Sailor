"use client";

// Use /client subpath — root entrypoint pulls server-only middleware.
import { getConfiguredAuthProvider, isAuthFeatureEnabledSync, useAuth } from "@nebutra/auth/client";
import {
  Warning as AlertTriangle,
  ChevronRight,
  Lifebuoy as LifeBuoy,
  SidebarLeft as PanelLeftClose,
  SidebarLeft as PanelLeftOpen,
} from "@nebutra/icons";
import { AppShell } from "@nebutra/ui/layout";
import type { SidebarNavRenderLinkProps, SidebarNavSection, Workspace } from "@nebutra/ui/patterns";
import { SidebarNav, WorkspaceSwitcher } from "@nebutra/ui/patterns";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo, webBrandLabels } from "@/components/brand/brand-assets";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";
import { LocaleSwitcher } from "@/components/navigation/locale-switcher";
import { OrgSwitcher } from "@/components/navigation/org-switcher";
import { SidebarProvider, useSidebar } from "@/components/navigation/sidebar-context";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { usePermission } from "@/hooks/usePermission";
import type { WebProductCapabilities } from "@/lib/product-capabilities";
import { resolvePreferredWorkspaceId } from "@/lib/workspace-selection";
import { buildBreadcrumbs, DASHBOARD_NAV_GROUPS, isActiveRoute, WORKSPACES } from "./dashboard-nav";

function HeaderAuthControls({
  supportsWorkspaceSwitching,
}: {
  supportsWorkspaceSwitching: boolean;
}) {
  const { isSignedIn } = useAuth();
  const { openDialog: openFeedback } = useFeedbackDialog();
  // Phase 2 dev rollout: gate the polished OrgSwitcher behind the
  // `organizations` auth feature flag. When off, the legacy native <select>
  // in the sidebar remains the only switcher (it still calls
  // /api/organizations/active correctly).
  const showOrgSwitcher = supportsWorkspaceSwitching && isAuthFeatureEnabledSync("organizations");

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      {isSignedIn ? (
        <>
          {showOrgSwitcher && <OrgSwitcher />}
          <button
            type="button"
            onClick={openFeedback}
            aria-label="Open feedback dialog"
            title="Feedback"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <LifeBuoy className="size-4" aria-hidden="true" />
            <span className="hidden xl:inline">Feedback</span>
          </button>
          <LocaleSwitcher />
          <UserMenu />
        </>
      ) : (
        <div className="flex gap-2">
          <Link
            href="/sign-in"
            className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 dark:text-white/70 dark:hover:bg-white/10"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-[var(--radius-md)] bg-[image:var(--brand-gradient)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  notificationCenter?: React.ReactNode;
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

function DesignSystemShellInner({ children, notificationCenter, productCapabilities }: Props) {
  const pathname = usePathname();
  const { isSignedIn, session } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const { can } = usePermission();
  const isAdmin = can("admin:access");
  const workspaceMode = productCapabilities?.workspace.mode ?? "organization";
  const supportsWorkspaceSwitching = workspaceMode === "organization";
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(() =>
    WORKSPACES.map((workspace) => ({
      id: workspace.id,
      label: workspace.label,
    })),
  );
  const [workspace, setWorkspace] = useState<string>(WORKSPACES[0].id);
  const breadcrumbs = buildBreadcrumbs(pathname);
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const isWorkspaceCanvasRoute = pathname.includes("/theme-playground");

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
    return DASHBOARD_NAV_GROUPS.flatMap((group) => {
      if (group.title === "Admin" && !isAdmin) {
        return [];
      }

      return [
        {
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
        },
      ];
    });
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
        <ViewTransitionLink
          href="/"
          aria-label={webBrandLabels.homeLink}
          className="inline-flex min-w-0 items-center rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandLogo
            variant={collapsed ? "mark" : "horizontal"}
            className={collapsed ? "size-8" : "h-7 w-[9.25rem]"}
          />
        </ViewTransitionLink>
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
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
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

  // ─── Dev-mode banner (only when @nebutra/auth is running the fixture provider) ─
  const isDevAuth = getConfiguredAuthProvider() === "dev";

  // ─── Header slot — breadcrumbs + quick links + auth controls ─────────────
  const headerContent = (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {currentBreadcrumb?.label ?? "Dashboard"}
        </p>
        <nav
          aria-label="Breadcrumb"
          className={cn("mt-0.5 hidden md:block", breadcrumbs.length <= 1 && "sr-only")}
        >
          <ol className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.href} className="flex min-w-0 items-center gap-1">
                  {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
                  {isLast ? (
                    <span className="truncate font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <ViewTransitionLink
                      href={crumb.href}
                      className="truncate transition-colors hover:text-foreground"
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

      <div className="flex shrink-0 items-center gap-1.5">
        {notificationCenter}
        <HeaderAuthControls supportsWorkspaceSwitching={supportsWorkspaceSwitching} />
      </div>
    </div>
  );

  return (
    <AppShell
      sidebar={sidebar}
      header={headerContent}
      collapsed={collapsed}
      contentClassName={
        isWorkspaceCanvasRoute ? "mx-0 max-w-none px-3 py-3 sm:px-4 md:px-5 2xl:px-6" : undefined
      }
    >
      {isDevAuth ? (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "mb-4 flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-50/80 px-4 py-1.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
            isWorkspaceCanvasRoute
              ? "-mx-3 sm:-mx-4 md:-mx-5 2xl:-mx-6"
              : "-mx-4 sm:-mx-6 md:-mx-8",
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            DEV AUTH ACTIVE: synthetic "Dev User", no DB writes. Set{" "}
            <code className="rounded bg-amber-200/50 px-1 font-mono text-[10px] dark:bg-amber-900/40">
              NEXT_PUBLIC_AUTH_PROVIDER
            </code>{" "}
            to a real provider to disable.
          </span>
        </div>
      ) : null}
      <section id="main-content" aria-label="Main content" className="content-area">
        {children}
      </section>
    </AppShell>
  );
}

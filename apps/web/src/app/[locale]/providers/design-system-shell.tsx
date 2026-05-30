"use client";

// Use /client subpath — root entrypoint pulls server-only middleware.
import { getConfiguredAuthProvider, useAuth } from "@nebutra/auth/client";
import {
  Warning as AlertTriangle,
  ChevronRight,
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
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-assets";
import { SidebarProvider, useSidebar } from "@/components/navigation/sidebar-context";
import { UserMenu } from "@/components/navigation/user-menu";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { NotificationsDialog } from "@/components/notifications/notifications-dialog";
import { usePermission } from "@/hooks/usePermission";
import type { WebProductCapabilities } from "@/lib/product-capabilities";
import { resolvePreferredWorkspaceId } from "@/lib/workspace-selection";
import { buildBreadcrumbs, DASHBOARD_NAV_GROUPS, isActiveRoute, WORKSPACES } from "./dashboard-nav";

interface Props {
  children: React.ReactNode;
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

function DesignSystemShellInner({ children, productCapabilities }: Props) {
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
  const isWorkspaceCanvasRoute = pathname.includes("/theme-playground");

  useEffect(() => {
    if (!isSignedIn || !supportsWorkspaceSwitching) return;

    let cancelled = false;

    async function loadWorkspaces() {
      try {
        const response = await fetch("/api/organizations", {
          credentials: "include",
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          organizations?: Array<{ id: string; name: string; slug?: string | null }>;
        } | null;
        const organizations = Array.isArray(payload?.organizations) ? payload.organizations : [];

        if (organizations.length === 0 || cancelled) {
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

        if (preferredWorkspaceId && !cancelled) {
          setWorkspace(preferredWorkspaceId);
        }
      } catch {
        // Swallow — fallback workspace state remains usable.
      }
    }

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, session?.organizationId, supportsWorkspaceSwitching]);

  async function handleWorkspaceChange(nextWorkspaceId: string) {
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
  }

  // ─── Map dashboard nav → SidebarNavSection[] ─────────────────────────────
  const sidebarSections: SidebarNavSection[] = DASHBOARD_NAV_GROUPS.flatMap((group) => {
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

  // ─── Workspaces mapped to WorkspaceSwitcher shape ────────────────────────
  const workspacesForSwitcher: Workspace[] = workspaceOptions.map((option) => ({
    id: option.id,
    name: option.label,
  }));

  // ─── Sidebar header slot — logo + workspace switcher ─────────────────────
  const sidebarHeader = (
    <div className="flex flex-col gap-2">
      <div
        className={cn("flex items-center px-2", collapsed ? "justify-center" : "justify-between")}
      >
        {collapsed ? (
          // Collapsed rail: the brand mark morphs into the expand icon on
          // sidebar hover — no room for a separate button.
          <button
            type="button"
            onClick={toggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="relative inline-flex size-7 items-center justify-center rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2"
          >
            <span className="flex items-center justify-center transition-opacity duration-150 group-hover/sidebar:opacity-0">
              <BrandLogo variant="mark" className="size-7" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center text-sidebar-foreground/70 opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100">
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            </span>
          </button>
        ) : (
          // Expanded: logo (home link) on the left, an always-visible collapse
          // button on the right — like Lovable.
          <>
            <ViewTransitionLink
              href="/workspace"
              aria-label="Home"
              className="inline-flex items-center rounded-[var(--radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2"
            >
              <BrandLogo variant="horizontal" className="h-6 w-[8.5rem]" />
            </ViewTransitionLink>
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="inline-flex size-7 items-center justify-center rounded-[var(--radius-md)] text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </button>
          </>
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

  // ─── Sidebar footer slot — single user row.
  // The user menu absorbs Feedback / Language / Theme; notifications live in
  // the content header. Collapsed rail: avatar-only trigger.
  const sidebarFooter = isSignedIn ? (
    collapsed ? (
      <div className="flex justify-center">
        <UserMenu />
      </div>
    ) : (
      <UserMenu variant="row" />
    )
  ) : null;

  const sidebar = (
    <SidebarNav
      className="group/sidebar"
      sections={sidebarSections}
      collapsed={collapsed}
      header={sidebarHeader}
      footer={sidebarFooter}
      renderLink={renderNextLink}
    />
  );

  // ─── Dev-mode banner (only when @nebutra/auth is running the fixture provider) ─
  const isDevAuth = getConfiguredAuthProvider() === "dev";

  // ─── Content header — breadcrumb (left, only when depth > 2 so shallow
  // routes like /settings don't echo their own H1) + notification bell
  // (right, micro top slot — always one click away from any page).
  const contentHeader = (
    <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        {breadcrumbs.length > 2 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex min-w-0 items-center gap-1 text-[12px] text-muted-foreground">
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
        )}
      </div>
      <NotificationsDialog />
    </div>
  );

  return (
    <AppShell
      sidebar={sidebar}
      collapsed={collapsed}
      contentClassName={
        isWorkspaceCanvasRoute
          ? "mx-0 max-w-none px-3 py-3 sm:px-4 md:px-5 2xl:px-6"
          : // Two-tier surface: tint the outer main bg so the `bg-card`
            // panels inside each page read as inset floating cards.
            "dashboard-app-content bg-muted/40"
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
              : "-mx-3 sm:-mx-4 md:-mx-5 2xl:-mx-6",
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
      {contentHeader}
      <section id="main-content" aria-label="Main content" className="content-area">
        {children}
      </section>
    </AppShell>
  );
}

"use client";

// Use /client subpath — root entrypoint pulls server-only middleware.
import { getConfiguredAuthProvider, useAuth } from "@nebutra/auth/client";
import {
  Warning as AlertTriangle,
  ChevronDoubleDown,
  ChevronDoubleUp,
  ChevronRight,
  FolderClosed,
  FolderPlus,
  Message,
  MoreHorizontal,
} from "@nebutra/icons";
import { AppShell } from "@nebutra/ui/layout";
import type {
  SidebarNavRenderLinkProps,
  SidebarNavSection,
  SidebarNavSectionAction,
  Workspace,
} from "@nebutra/ui/patterns";
import { SidebarNav, WorkspaceSwitcher } from "@nebutra/ui/patterns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  toast,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useState } from "react";
import { BrandLogo, webBrandLabels } from "@/components/brand/brand-assets";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";
import { SidebarProvider, useSidebar } from "@/components/navigation/sidebar-context";
import {
  useSidebarExpansion,
  useSidebarExpansionStore,
} from "@/components/navigation/sidebar-expansion-store";
import { UserMenu } from "@/components/navigation/user-menu";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { NotificationsDialog } from "@/components/notifications/notifications-dialog";
import { usePermission } from "@/hooks/usePermission";
import type { WebProductCapabilities } from "@/lib/product-capabilities";
import { queryKeys } from "@/lib/query-keys";
import { resolvePreferredWorkspaceId } from "@/lib/workspace-selection";
import {
  buildBreadcrumbs,
  getDashboardNavGroups,
  isActiveRoute,
  WORKSPACES,
} from "./dashboard-nav";

interface OrganizationSummary {
  id: string;
  name: string;
  slug?: string | null;
}

// ─── Server reads (replaces manual useEffect + AbortController/`cancelled`) ───
// The queryFn `signal` cancels the fetch on unmount / key change, exactly as
// the old `let cancelled` flag did. JSON parse failures and non-ok responses
// surface as thrown errors so React Query exposes them via `query.error`.
async function fetchOrganizations(signal?: AbortSignal): Promise<OrganizationSummary[]> {
  const response = await fetch("/api/organizations", { credentials: "include", signal });
  if (!response.ok) {
    throw new Error(`Failed to load organizations (${response.status})`);
  }
  const payload = (await response.json().catch(() => null)) as {
    organizations?: OrganizationSummary[];
  } | null;
  return Array.isArray(payload?.organizations) ? payload.organizations : [];
}

async function fetchThreads(workspaceId: string, signal?: AbortSignal): Promise<ThreadSummary[]> {
  const response = await fetch(`/api/organizations/${workspaceId}/threads`, {
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load threads (${response.status})`);
  }
  const payload = (await response.json().catch(() => null)) as {
    threads?: ThreadSummary[];
  } | null;
  return Array.isArray(payload?.threads) ? payload.threads : [];
}

interface Props {
  children: React.ReactNode;
  productCapabilities?: WebProductCapabilities;
}

interface WorkspaceOption {
  id: string;
  label: string;
}

interface ThreadSummary {
  id: string;
  title: string;
  lastActivityAt: string;
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
  const { collapsed } = useSidebar();
  const { can } = usePermission();
  const isAdmin = can("admin:access");
  const workspaceMode = productCapabilities?.workspace.mode ?? "organization";
  const startupAgentOSEnabled = productCapabilities?.prototypes?.startupAgentOS ?? true;
  const navCapabilities = { startupAgentOS: startupAgentOSEnabled };
  const isWorkspaceCanvasRoute = pathname.includes("/theme-playground");
  const isStartupOSRoute = pathname.includes("/startup-os");
  // /workspace home is a full-bleed gradient canvas — drop main padding and
  // skip the `contain: paint` content-area wrapper so the gradient reaches
  // the viewport edges.
  const isWorkspaceHomeRoute = /^\/[a-z]{2}\/workspace\/?$/.test(pathname);
  const supportsWorkspaceSwitching = workspaceMode === "organization";
  const queryClient = useQueryClient();
  // Active-workspace selection is PURE CLIENT STATE (driven by localStorage /
  // session preference) — kept local, never in React Query cache.
  const [workspace, setWorkspace] = useState<string>(WORKSPACES[0].id);
  const tSidebar = useTranslations("Sidebar");
  const { openDialog: openFeedback } = useFeedbackDialog();

  // ─── Server read: organization list (replaces loadWorkspaces useEffect) ────
  const organizationsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: ({ signal }) => fetchOrganizations(signal),
    enabled: isSignedIn && supportsWorkspaceSwitching,
  });

  // Startup OS must not render seed workspaces: its project list is backed by
  // the Startup OS API, so sidebar workspaces only appear after real orgs load.
  const organizations = organizationsQuery.data ?? [];
  const workspaceOptions: WorkspaceOption[] =
    organizations.length > 0
      ? organizations.map((organization) => ({
          id: organization.id,
          label: organization.name || organization.slug || "Untitled workspace",
        }))
      : isStartupOSRoute
        ? []
        : WORKSPACES.map((ws) => ({ id: ws.id, label: ws.label }));
  const activeWorkspaceId = workspaceOptions.some((option) => option.id === workspace)
    ? workspace
    : null;

  // Resolve the preferred active workspace once real orgs land. This is the
  // localStorage/session-driven selection the old loadWorkspaces effect did
  // inline — it stays LOCAL (pure client preference, not server cache).
  useEffect(() => {
    const organizations = organizationsQuery.data;
    if (!organizations || organizations.length === 0) return;

    const options = organizations.map((organization) => ({ id: organization.id }));
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
  }, [organizationsQuery.data, session?.organizationId]);

  // ─── Server read: active workspace threads (replaces loadThreads useEffect) ─
  // The 5 most-recent threads for the active workspace. Other workspaces expand
  // on click to an empty state without prefetching (v1). handleNewProject
  // invalidates this key to refresh after a POST.
  const threadsQuery = useQuery({
    queryKey: queryKeys.orgThreads.list(activeWorkspaceId ?? "__none__"),
    queryFn: ({ signal }) => fetchThreads(activeWorkspaceId ?? "", signal),
    enabled: isSignedIn && supportsWorkspaceSwitching && Boolean(activeWorkspaceId),
  });
  const activeWorkspaceThreads = threadsQuery.data ?? [];

  // ─── Persistent Projects-section expansion ────────────────────────────────
  // zustand persist store (localStorage). SSR-safe: rehydration is deferred to
  // the mount effect below so SSR stays deterministic (empty map). When the
  // rehydrated snapshot has any open group, fire the restored-groups toast once.
  const { map: expansionMap, setOpen: setExpansionOpen } = useSidebarExpansion();

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only hydration; toast copy is captured once
  useEffect(() => {
    void useSidebarExpansionStore.persist.rehydrate();
    if (useSidebarExpansionStore.getState().hasRestored()) {
      toast(tSidebar("restoredGroups"), { duration: 3000 });
    }
    // Run once on mount; toast copy can't change after hydration.
  }, []);
  const breadcrumbs = buildBreadcrumbs(pathname, navCapabilities);
  const currentBreadcrumb = breadcrumbs.at(-1);

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
  // Order: Product → Projects → Admin. Projects lists workspaces; the active
  // workspace expands with its 5 most-recent threads pre-loaded. Inactive
  // workspace parents act as workspace-switch triggers and do not prefetch.
  // Rendered whenever workspaces are available — including single-user / dev-auth
  // modes where the seed WORKSPACES provide a meaningful project list.
  const projectsAllExpanded = Object.values(expansionMap).some((v) => v);

  const handleExpandAllToggle = () => {
    const itemsWithChildren = workspaceOptions
      .filter((ws) => ws.id === workspace) // only the active workspace item has children today
      .map((ws) => `workspace:${ws.id}`);
    if (projectsAllExpanded) {
      // Collapse all known entries.
      for (const key of Object.keys(expansionMap)) setExpansionOpen(key, false);
      return;
    }
    for (const id of itemsWithChildren) setExpansionOpen(id, true);
  };

  // New-project flow — v1 uses window.prompt to avoid a new dialog component.
  // POSTs to the existing /threads route, then invalidates the threads query so
  // the sidebar list refetches the canonical server order (no optimistic insert
  // — keeps lastActivityAt sort honest with no rollback path).
  const handleNewProject = async () => {
    if (!supportsWorkspaceSwitching || !workspace) return;
    const defaultTitle = tSidebar("newProjectDefault");
    const input =
      typeof window !== "undefined"
        ? window.prompt(tSidebar("newProjectPlaceholder"), defaultTitle)
        : null;
    if (input === null) return; // user cancelled
    const title = input.trim().length > 0 ? input.trim() : defaultTitle;
    try {
      const response = await fetch(`/api/organizations/${workspace}/threads`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        toast.error(tSidebar("newProjectError"));
        return;
      }
      toast.success(tSidebar("newProjectSuccess"));
      // Ensure the Projects > active-workspace row is open so the user sees
      // their new thread land in the list.
      const activeItemId = `workspace:${workspace}`;
      if (!expansionMap[activeItemId]) {
        setExpansionOpen(activeItemId, true);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orgThreads.list(workspace),
      });
    } catch {
      toast.error(tSidebar("newProjectError"));
    }
  };

  // note: section-more uses an inline DropdownMenu via the action's `render`
  // hook (added to SidebarNavSectionAction). This keeps the SidebarNav API
  // single-purpose (icon buttons in the gutter) and lets the shell own the
  // menu's state without a `headerSlot` overhaul.
  const projectsActions: SidebarNavSectionAction[] = [
    {
      id: "expand-all-toggle",
      icon: projectsAllExpanded ? ChevronDoubleUp : ChevronDoubleDown,
      label: projectsAllExpanded ? tSidebar("collapseAll") : tSidebar("expandAll"),
      onClick: handleExpandAllToggle,
    },
    {
      id: "section-more",
      icon: MoreHorizontal,
      label: tSidebar("sectionMore"),
      render: (defaultButton) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{defaultButton}</DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => handleExpandAllToggle()}>
              {projectsAllExpanded ? tSidebar("collapseAll") : tSidebar("expandAll")}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{tSidebar("sortBy")}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  {tSidebar("sortRecent")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled title={tSidebar("comingV2")}>
                  {tSidebar("sortAlphabetical")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled title={tSidebar("comingV2")}>
                  {tSidebar("sortCreated")}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled title={tSidebar("comingV2")}>
              {tSidebar("archiveAll")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      id: "new-project",
      icon: FolderPlus,
      label: tSidebar("newProject"),
      onClick: () => {
        void handleNewProject();
      },
    },
  ];

  const projectsSection: SidebarNavSection | null =
    workspaceOptions.length > 0
      ? {
          id: "Projects",
          label: tSidebar("projects"),
          actions: projectsActions,
          items: workspaceOptions.map((ws) => {
            const isActiveWorkspace = ws.id === workspace;
            const itemId = `workspace:${ws.id}`;
            let children: SidebarNavSection["items"][number]["children"];

            if (isActiveWorkspace) {
              children =
                activeWorkspaceThreads.length > 0
                  ? activeWorkspaceThreads.map((thread) => ({
                      id: `thread:${thread.id}`,
                      label: thread.title,
                      href: `/workspace?threadId=${thread.id}`,
                      isActive: false,
                    }))
                  : [
                      {
                        id: `empty:${ws.id}`,
                        label: tSidebar("noThreads"),
                        isActive: false,
                        disabled: true,
                      },
                    ];
            }

            const hasChildren = Array.isArray(children) && children.length > 0;

            return {
              id: itemId,
              label: ws.label,
              icon: FolderClosed,
              isActive: isActiveWorkspace,
              // Non-active workspace parents switch workspace on click rather
              // than navigating to an href.
              onClick: isActiveWorkspace ? undefined : () => void handleWorkspaceChange(ws.id),
              children,
              // Controlled expansion only when the item actually has children
              // — leaves childless rows unaffected.
              ...(hasChildren
                ? {
                    expanded: expansionMap[itemId] ?? isActiveWorkspace,
                    onExpandedChange: (next: boolean) => setExpansionOpen(itemId, next),
                  }
                : {}),
            };
          }),
        }
      : null;

  const sidebarSections: SidebarNavSection[] = getDashboardNavGroups(navCapabilities).flatMap(
    (group) => {
      if (group.title === "Admin" && !isAdmin) {
        return [];
      }

      const groupSection: SidebarNavSection = {
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
      };

      // Insert Projects between Product and Admin.
      if (group.title === "Product" && projectsSection) {
        return [groupSection, projectsSection];
      }

      return [groupSection];
    },
  );

  // ─── Workspaces mapped to WorkspaceSwitcher shape ────────────────────────
  const workspacesForSwitcher: Workspace[] = workspaceOptions.map((option) => ({
    id: option.id,
    name: option.label,
  }));

  // ─── Sidebar header slot — logo + workspace switcher ─────────────────────
  const sidebarHeader = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center px-2">
        <ViewTransitionLink
          href="/workspace"
          aria-label={webBrandLabels.homeLink}
          className="inline-flex min-w-0 items-center justify-center rounded-none border-0 bg-transparent shadow-none outline-none ring-0 hover:bg-transparent focus-visible:rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2"
        >
          <BrandLogo
            variant={collapsed ? "mark" : "horizontal"}
            className={collapsed ? "size-7" : "h-6 w-[8.5rem]"}
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

  // ─── Sidebar footer slot — user row + notification bell.
  // The user menu absorbs Language / Theme; feedback stays in the content
  // header so every route has a stable global issue-report affordance.
  const sidebarFooter = isSignedIn ? (
    collapsed ? (
      <div className="flex flex-col items-center gap-1">
        <NotificationsDialog />
        <UserMenu />
      </div>
    ) : (
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <UserMenu variant="row" />
        </div>
        <NotificationsDialog />
      </div>
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

  // ─── Content header — one quiet page title plus a progressive breadcrumb.
  // Shallow routes keep the title for screen readers only, so page content can
  // own the visible H1 without duplicating dashboard chrome.
  const contentHeader = (
    <div className="mb-4 flex shrink-0 items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "truncate text-sm font-semibold text-foreground",
            breadcrumbs.length <= 1 && "sr-only",
          )}
        >
          {currentBreadcrumb?.label ?? "Dashboard"}
        </h1>
        {breadcrumbs.length > 1 ? (
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
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Open feedback dialog"
        onClick={openFeedback}
        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Message className="size-3.5" aria-hidden="true" />
        <span className="hidden xl:inline">Feedback</span>
      </button>
    </div>
  );

  return (
    <AppShell
      sidebar={sidebar}
      collapsed={collapsed}
      contentClassName={
        isWorkspaceHomeRoute
          ? // Full-bleed gradient canvas: drop padding at every breakpoint
            // (AppShell's base sm/md/2xl:px-* would otherwise beat a plain
            // p-0 via specificity), make main the positioned ancestor so
            // the page's absolute gradient fills it edge-to-edge. Banner +
            // content header sit on top of the gradient.
            "relative p-0 sm:p-0 md:p-0 2xl:p-0"
          : isWorkspaceCanvasRoute
            ? "mx-0 max-w-none px-3 py-3 sm:px-4 md:px-5 2xl:px-6"
            : isStartupOSRoute
              ? "mx-0 max-w-none p-0 sm:p-0 md:p-0 2xl:p-0"
              : // Two-tier surface: tint the outer main bg so the `bg-card`
                // panels inside each page read as inset floating cards.
                "dashboard-app-content bg-muted/40"
      }
    >
      {isWorkspaceHomeRoute ? (
        // First child of main: an absolute gradient canvas that fills the
        // entire <main> (which is `relative`). Everything below renders
        // later in DOM and therefore on top in flow order (no z-index
        // gymnastics — auto over auto wins by source order).
        <div
          aria-hidden="true"
          className="workspace-home-gradient pointer-events-none absolute inset-0"
        />
      ) : null}
      {isDevAuth && !isStartupOSRoute ? (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "mb-4 flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-50/80 px-4 py-1.5 text-[11px] font-medium text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100",
            isWorkspaceHomeRoute
              ? // Home main has p-0; banner already runs edge-to-edge, no
                // negative margin needed. relative+z keeps it above gradient.
                "relative z-10"
              : "-mx-3 sm:-mx-4 md:-mx-5 2xl:-mx-6",
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            DEV AUTH ACTIVE: synthetic "Dev User", no DB writes. Set{" "}
            <code className="rounded bg-amber-200/50 px-1 font-mono text-[10px] text-amber-950 dark:bg-amber-500/30 dark:text-amber-50">
              NEXT_PUBLIC_AUTH_PROVIDER
            </code>{" "}
            to a real provider to disable.
          </span>
        </div>
      ) : null}
      {contentHeader}
      {isWorkspaceHomeRoute || isStartupOSRoute ? (
        // No `.content-area` wrapper on full-bleed workspaces: `contain: paint`
        // would clip edge-to-edge canvases and add an unnecessary route shell.
        children
      ) : (
        <section id="main-content" aria-label="Main content" className="content-area">
          {children}
        </section>
      )}
    </AppShell>
  );
}

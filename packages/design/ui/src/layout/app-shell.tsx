"use client";

import { Menu } from "@nebutra/icons";
import * as React from "react";

import { Sheet, SheetContent } from "../primitives/sheet";
import { cn } from "../utils/cn";

export interface AppShellProps {
  /** Sidebar slot — typically a `SidebarNav` or equivalent navigation tree. */
  sidebar: React.ReactNode;
  /** Optional sticky top header (breadcrumbs, search, user menu). */
  header?: React.ReactNode;
  /** Main content rendered inside `<main>`. */
  children: React.ReactNode;
  /** Sidebar width in pixels when expanded. */
  sidebarWidth?: number;
  /** Sidebar width in pixels when collapsed (icon-only rail). */
  sidebarCollapsedWidth?: number;
  /** Controlled collapsed state. When provided, the component is fully controlled. */
  collapsed?: boolean;
  /** Default collapsed state for uncontrolled usage. */
  defaultCollapsed?: boolean;
  /** Fires whenever the collapsed state changes (both controlled + uncontrolled). */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Render the desktop sidebar as a floating overlay (absolute, z-40) instead of
   *  an in-flow rail that compresses main — for full-bleed builder routes that
   *  drive their own toggle. When collapsed to 0 width it's simply invisible. */
  overlay?: boolean;
  /** Height in pixels of the sticky header row. Defaults to 48. */
  headerHeight?: number;
  /** Override the default container styles applied to `<main>`. */
  contentClassName?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

const DEFAULT_SIDEBAR_WIDTH = 224;
const DEFAULT_COLLAPSED_WIDTH = 52;
const DEFAULT_HEADER_HEIGHT = 48;

/**
 * AppShell — top-level dashboard chrome: sidebar + sticky header + scrollable main.
 *
 * Modeled after Vercel / Linear / MiniMax application shells. The sidebar is a
 * fixed-width rail on `md+` viewports and collapses into a `Sheet` overlay on
 * mobile (triggered by the hamburger button shown in the header).
 *
 * The sidebar width animates smoothly (200ms ease-out) when toggling between
 * the expanded and collapsed states so it can host an icon-only rail.
 *
 * @status stable
 *
 * @example
 * ```tsx
 * <AppShell
 *   sidebar={<SidebarNav items={navItems} />}
 *   header={<DashboardHeader />}
 * >
 *   <PageHeader title="Overview" />
 *   {children}
 * </AppShell>
 * ```
 */
export function AppShell({
  sidebar,
  header,
  children,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  sidebarCollapsedWidth = DEFAULT_COLLAPSED_WIDTH,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  contentClassName,
  className,
  overlay = false,
}: AppShellProps) {
  const isControlled = collapsed !== undefined;
  const [internalCollapsed] = React.useState(defaultCollapsed);
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const railWidth = isCollapsed ? sidebarCollapsedWidth : sidebarWidth;

  return (
    <div
      data-ui="nebutra-app-shell"
      className={cn(
        "relative flex h-screen w-full overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      {/* Desktop sidebar — fixed rail, hidden on small screens. When the rail
          width collapses to 0 (e.g. a full-bleed route that drives its own
          navigation toggle), drop the border so no seam line remains. */}
      <aside
        aria-label="Primary"
        className={cn(
          "hidden h-screen overflow-hidden bg-sidebar text-sidebar-foreground md:block",
          "transition-[width] duration-200 ease-out",
          overlay ? "absolute inset-y-0 left-0 z-40" : "shrink-0",
          railWidth > 0 && "border-r border-sidebar-border",
          overlay && railWidth > 0 && "shadow-2xl",
        )}
        style={{ width: railWidth }}
      >
        <div
          className="h-full overflow-y-auto"
          style={{ width: isCollapsed ? sidebarCollapsedWidth : sidebarWidth }}
        >
          {sidebar}
        </div>
      </aside>

      {/* Overlay backdrop — when the sidebar floats over the content (overlay mode)
          and is expanded, a click on the dimmed content collapses it. */}
      {overlay && !isCollapsed ? (
        <button
          type="button"
          aria-label="Collapse navigation"
          onClick={() => onCollapsedChange?.(true)}
          className="absolute inset-0 z-30 hidden cursor-default bg-foreground/20 backdrop-blur-[1px] md:block"
        />
      ) : null}

      {/* Mobile sidebar — Sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-sidebar-border bg-sidebar p-0">
          <div className="h-full overflow-y-auto">{sidebar}</div>
        </SheetContent>
      </Sheet>

      {/* Right column — header + main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header !== undefined && (
          <header
            className={cn(
              "sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border",
              "bg-background/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:px-4",
            )}
            style={{ height: headerHeight }}
          >
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "relative inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] text-foreground/80 after:absolute after:-inset-1.5 after:content-['']",
                "hover:bg-muted hover:text-foreground md:hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              )}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">{header}</div>
          </header>
        )}

        {/* Header is optional — still show a mobile-only hamburger row when header is omitted */}
        {header === undefined && (
          <div className="flex shrink-0 items-center border-b border-border bg-background px-4 py-2 md:hidden">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "relative inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] text-foreground/80 after:absolute after:-inset-1.5 after:content-['']",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              )}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <main
          className={cn(
            "min-h-0 flex-1 overflow-y-auto w-full max-w-none px-3 py-4 sm:px-4 md:px-5 2xl:px-6",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

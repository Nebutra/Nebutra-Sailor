"use client";

import { Menu } from "lucide-react";
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
  /** Height in pixels of the sticky header row. Defaults to 56. */
  headerHeight?: number;
  /** Override the default container styles applied to `<main>`. */
  contentClassName?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

const DEFAULT_SIDEBAR_WIDTH = 240;
const DEFAULT_COLLAPSED_WIDTH = 64;
const DEFAULT_HEADER_HEIGHT = 56;

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
}: AppShellProps) {
  const isControlled = collapsed !== undefined;
  const [internalCollapsed] = React.useState(defaultCollapsed);
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  // Notify parent when the collapsed prop transitions (controlled-mode passthrough).
  const lastReportedRef = React.useRef(isCollapsed);
  React.useEffect(() => {
    if (lastReportedRef.current !== isCollapsed) {
      lastReportedRef.current = isCollapsed;
      onCollapsedChange?.(isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const railWidth = isCollapsed ? sidebarCollapsedWidth : sidebarWidth;

  return (
    <div
      className={cn("relative flex min-h-screen w-full bg-background text-foreground", className)}
    >
      {/* Desktop sidebar — fixed rail, hidden on small screens */}
      <aside
        aria-label="Primary"
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-neutral-4 bg-neutral-2 md:block",
          "transition-[width] duration-200 ease-out",
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

      {/* Mobile sidebar — Sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-neutral-4 bg-neutral-2 p-0">
          <div className="h-full overflow-y-auto">{sidebar}</div>
        </SheetContent>
      </Sheet>

      {/* Right column — header + main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {header !== undefined && (
          <header
            className={cn(
              "sticky top-0 z-30 flex items-center gap-3 border-b border-border",
              "bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6",
            )}
            style={{ height: headerHeight }}
          >
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/80",
                "hover:bg-muted hover:text-foreground md:hidden",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
              )}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3">{header}</div>
          </header>
        )}

        {/* Header is optional — still show a mobile-only hamburger row when header is omitted */}
        {header === undefined && (
          <div className="flex items-center border-b border-border bg-background px-4 py-2 md:hidden">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/80",
                "hover:bg-muted hover:text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
              )}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        <main
          className={cn(
            "mx-auto w-full max-w-[var(--container-wide)] px-4 py-6 sm:px-6 md:px-8",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

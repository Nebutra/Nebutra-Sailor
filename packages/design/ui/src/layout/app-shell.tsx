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
  /**
   * The working area's surface. `canvas` (default) keeps the app canvas behind
   * header and content; `card` puts them on the card surface beside a canvas
   * sidebar — the flat, edge-ruled layout of current product dashboards, where
   * sections sit on one surface instead of boxed cards on a tinted canvas.
   */
  surface?: "canvas" | "card" | "inset";
  /**
   * A faint wash of the House blue from the top edge of the working area —
   * the "lit from above" canvas of Linear and Vercel, not a colour block.
   * Off by default; product shells opt in.
   */
  ambientLight?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
  /**
   * Content beside the hamburger in the phone-width bar shown when there is no
   * `header` — usually the workspace or brand mark, so the bar is not empty.
   */
  mobileBar?: React.ReactNode;
  /** Accessible name for the primary sidebar landmark. Pass a translated string. */
  primaryNavLabel?: string;
  /** Accessible name for the overlay-collapse button. Pass a translated string. */
  collapseNavigationLabel?: string;
  /** Accessible name for the mobile hamburger button. Pass a translated string. */
  openNavigationMenuLabel?: string;
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
 * The sidebar width animates smoothly (duration-flow, ease-out) when toggling
 * between the expanded and collapsed states so it can host an icon-only rail.
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
  primaryNavLabel = "Primary",
  collapseNavigationLabel = "Collapse navigation",
  openNavigationMenuLabel = "Open navigation menu",
  surface = "canvas",
  ambientLight = false,
  mobileBar,
}: AppShellProps) {
  // `inset`: the working area is a raised panel inside the canvas, with a
  // hairline, a lit top edge and one soft shadow step — the layered shell of
  // Linear and Vercel. Below md it is a plain card surface (no gutter).
  const isInset = surface === "inset";
  const isCardLike = surface === "card" || isInset;
  const isControlled = collapsed !== undefined;
  const [internalCollapsed] = React.useState(defaultCollapsed);
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const railWidth = isCollapsed ? sidebarCollapsedWidth : sidebarWidth;

  return (
    <div
      data-ui="nebutra-app-shell"
      className={cn(
        "relative flex h-dvh w-full overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      {/* Desktop sidebar — fixed rail, hidden on small screens. When the rail
          width collapses to 0 (e.g. a full-bleed route that drives its own
          navigation toggle), drop the border so no seam line remains. */}
      <aside
        aria-label={primaryNavLabel}
        className={cn(
          "hidden h-dvh overflow-hidden bg-sidebar text-sidebar-foreground md:block",
          "transition-[width] duration-flow ease-out",
          overlay ? "absolute inset-y-0 start-0 z-40" : "shrink-0",
          railWidth > 0 && !isInset && "border-e border-sidebar-border",
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
          aria-label={collapseNavigationLabel}
          onClick={() => onCollapsedChange?.(true)}
          className="absolute inset-0 z-30 hidden cursor-default bg-foreground/25 backdrop-blur-xs md:block"
        />
      ) : null}

      {/* Mobile sidebar — Sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="start" className="w-72 border-e border-sidebar-border bg-sidebar p-0">
          <div className="h-full overflow-y-auto">{sidebar}</div>
        </SheetContent>
      </Sheet>

      {/* Right column — header + main */}
      <div
        data-surface={surface}
        className={cn(
          "relative isolate flex min-h-0 min-w-0 flex-1 flex-col",
          isCardLike && "bg-card",
          isInset &&
            "md:my-2 md:me-2 md:overflow-hidden md:rounded-xl md:border md:border-border/80 md:shadow-glass-sm",
        )}
      >
        {ambientLight ? (
          <div
            aria-hidden="true"
            data-slot="ambient-light"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,hsl(var(--ring)/0.07),transparent_70%)]"
          />
        ) : null}
        {header !== undefined && (
          <header
            className={cn(
              "sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border",
              isCardLike
                ? "bg-card/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 sm:px-4"
                : "bg-background/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:px-4",
            )}
            style={{ height: headerHeight }}
          >
            <button
              type="button"
              aria-label={openNavigationMenuLabel}
              onClick={() => setMobileOpen(true)}
              className={cn(
                "relative inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] text-foreground/80 after:absolute after:-inset-1.5 after:content-['']",
                "transition-colors duration-micro ease-brand hover:bg-muted hover:text-foreground md:hidden",
              )}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">{header}</div>
          </header>
        )}

        {/* Header is optional — still show a mobile-only hamburger row when header is omitted */}
        {header === undefined && (
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-border px-4 py-2 md:hidden",
              isCardLike ? "bg-card" : "bg-background",
            )}
          >
            <button
              type="button"
              aria-label={openNavigationMenuLabel}
              onClick={() => setMobileOpen(true)}
              className={cn(
                "relative inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] text-foreground/80 after:absolute after:-inset-1.5 after:content-['']",
                "transition-colors duration-micro ease-brand hover:bg-muted hover:text-foreground",
              )}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            {mobileBar ? (
              <div className="ms-2 flex min-w-0 flex-1 items-center">{mobileBar}</div>
            ) : null}
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

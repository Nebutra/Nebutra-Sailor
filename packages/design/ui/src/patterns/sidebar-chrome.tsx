"use client";

import { ChevronUpDown, MagnifyingGlass } from "@nebutra/icons";
import type * as React from "react";
import { Kbd } from "../primitives/kbd";
import { cn } from "../utils/cn";
import { RENDERS_NATIVE_BUTTON } from "../utils/native-button";

/**
 * Sidebar chrome — the three pieces that make a rail read as an app rather
 * than a list of links (Linear, Resend, ElevenLabs, Vercel):
 *
 * - `SidebarWorkspacePlate`: the workspace's mark on a small lit plate, its
 *   name and plan, and an up/down chevron. A button, so it can be a menu
 *   trigger (`DropdownMenuTrigger asChild`).
 * - `SidebarSearchButton`: the command bar's presence in the rail — a quiet
 *   field-shaped button with its shortcut.
 * - `SidebarUsageMeter`: plan, one meter and one action, pinned above the
 *   account row.
 *
 * Tokens only: card surface, sidebar hairline, the xs shadow step. The meter
 * fills with ink and turns warning / destructive near its limit.
 */

// ─── Workspace plate ─────────────────────────────────────────────────────────

export interface SidebarWorkspacePlateProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Workspace or organization name. */
  name: string;
  /** The mark drawn on the plate (a logo image or brand mark). Falls back to initials. */
  logo?: React.ReactNode;
  /** Short plan label shown as a pill after the name ("Free", "Pro"). */
  plan?: string;
  /** Icon-only rail: the plate alone. */
  collapsed?: boolean;
  /** Hide the up/down chevron (when the plate is not a menu trigger). */
  hideChevron?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "··";
}

/** The plate itself — exported so other surfaces (menus, switchers) draw the same object. */
export function SidebarLogoPlate({
  logo,
  name,
  size = "md",
  className,
}: {
  logo?: React.ReactNode;
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="logo-plate"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-card text-xs font-semibold text-foreground",
        "shadow-xs ring-1 ring-inset ring-border",
        size === "md" ? "size-6" : "size-5",
        className,
      )}
    >
      {logo ?? initialsOf(name)}
    </span>
  );
}

export function SidebarWorkspacePlate({
  name,
  logo,
  plan,
  collapsed = false,
  hideChevron = false,
  className,
  ref,
  ...rest
}: SidebarWorkspacePlateProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      data-slot="workspace-plate"
      className={cn(
        "group/plate flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] text-left outline-none",
        "transition-[background-color] duration-micro ease-brand hover:bg-sidebar-accent/70",
        collapsed ? "size-8 justify-center" : "h-8 w-full px-1.5",
        className,
      )}
    >
      <SidebarLogoPlate logo={logo} name={name} />
      {collapsed ? (
        <span className="sr-only">{name}</span>
      ) : (
        <>
          <span className="min-w-0 truncate text-ui font-medium text-sidebar-foreground">
            {name}
          </span>
          {plan ? (
            <span className="shrink-0 rounded-full border border-sidebar-border bg-card px-1.5 py-px text-xs font-medium text-sidebar-foreground/70">
              {plan}
            </span>
          ) : null}
          {hideChevron ? null : (
            <ChevronUpDown
              aria-hidden="true"
              className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/45 transition-colors group-hover/plate:text-sidebar-foreground/70"
            />
          )}
        </>
      )}
    </button>
  );
}
(SidebarWorkspacePlate as unknown as Record<symbol, boolean>)[RENDERS_NATIVE_BUTTON] = true;

// ─── Search / command bar ────────────────────────────────────────────────────

export interface SidebarSearchButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Visible placeholder, e.g. "Search or jump to…". Also the accessible name. */
  label: string;
  /** Key (with ⌘ / Ctrl) that opens the command bar. Default "K". */
  shortcutKey?: string;
  collapsed?: boolean;
}

export function SidebarSearchButton({
  label,
  shortcutKey = "K",
  collapsed = false,
  className,
  ...rest
}: SidebarSearchButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-label={label}
      aria-keyshortcuts={`Meta+${shortcutKey}`}
      data-slot="sidebar-search"
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] text-sidebar-foreground/60 outline-none",
        "transition-[background-color,color] duration-micro ease-brand hover:text-sidebar-foreground",
        collapsed
          ? "mx-auto size-8 justify-center hover:bg-sidebar-accent/70"
          : "h-8 w-full border border-sidebar-border bg-card/70 px-2.5 text-ui shadow-xs hover:bg-card",
        className,
      )}
    >
      <MagnifyingGlass aria-hidden="true" className="size-3.5 shrink-0" />
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          <Kbd meta small aria-hidden="true">
            {shortcutKey}
          </Kbd>
        </>
      )}
    </button>
  );
}

// ─── Usage meter ─────────────────────────────────────────────────────────────

export interface SidebarUsageMeterProps {
  /** Plan name — the card's title ("Free plan"). */
  plan: string;
  /** What the meter measures ("Credits this month"). */
  label: string;
  /** Amount on the meter (used, or remaining — see `measure`). */
  used?: number;
  /**
   * `used` (default): the bar fills as the allowance is spent and warns near
   * the limit. `remaining`: the bar is what is left (a credit balance) and
   * warns when it runs low.
   */
  measure?: "used" | "remaining";
  /** Allowance. Non-positive or missing = unmetered (no bar). */
  limit?: number;
  /** Pre-formatted value line, e.g. "1,240 of 5,000". */
  valueLabel?: string;
  /** One action, usually an upgrade or "View usage" link. */
  action?: React.ReactNode;
  className?: string;
}

export function SidebarUsageMeter({
  plan,
  label,
  used,
  measure = "used",
  limit,
  valueLabel,
  action,
  className,
}: SidebarUsageMeterProps) {
  const metered = typeof limit === "number" && limit > 0;
  const percent = metered && typeof used === "number" ? Math.min((used / limit) * 100, 100) : 0;
  // How much of the allowance is gone, whichever way the bar is drawn. An
  // empty bar has no colour to warn with, so the tone applies only when it shows.
  const spent = measure === "used" ? percent : 100 - percent;
  const visible = percent > 0;
  const fill =
    visible && spent >= 95
      ? "bg-destructive"
      : visible && spent >= 80
        ? "bg-warning"
        : "bg-primary";

  return (
    <div
      data-slot="sidebar-usage-meter"
      className={cn(
        "rounded-[var(--radius-lg)] bg-card p-3",
        "shadow-xs ring-1 ring-inset ring-sidebar-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-sidebar-foreground">{plan}</span>
        {action ? <span className="shrink-0 text-xs">{action}</span> : null}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-sidebar-foreground/60">{label}</span>
        {valueLabel ? (
          <span className="shrink-0 tabular-nums text-sidebar-foreground/80">{valueLabel}</span>
        ) : null}
      </div>
      {metered ? (
        // biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot take the token fill and track; role="meter" carries the same semantics
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used ?? 0}
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sidebar-accent"
        >
          <div
            className={cn(
              "h-full w-[var(--meter-fill)] rounded-full transition-[width] duration-flow ease-out motion-reduce:transition-none",
              fill,
            )}
            style={
              { "--meter-fill": `${visible ? Math.max(percent, 2) : 0}%` } as React.CSSProperties
            }
          />
        </div>
      ) : null}
    </div>
  );
}

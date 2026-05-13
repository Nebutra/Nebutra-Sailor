"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";
import { Badge } from "../../primitives/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../primitives/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";
import { cn } from "../../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SidebarNavBadgeTone = "beta" | "new" | "owner" | "featured" | "coming-soon";

export interface SidebarNavBadge {
  label: string;
  tone: SidebarNavBadgeTone;
}

export type SidebarNavIcon = React.ComponentType<{ className?: string }>;

export interface SidebarNavItem {
  id: string;
  label: string;
  href?: string;
  icon?: SidebarNavIcon;
  badge?: SidebarNavBadge;
  isActive?: boolean;
  external?: boolean;
  onClick?: () => void;
  /** Nested children — 1 level deep max */
  children?: SidebarNavItem[];
  disabled?: boolean;
}

export interface SidebarNavSection {
  id: string;
  /** Group label, e.g. "MiniMax 实验室". Hidden when collapsed. */
  label?: string;
  items: SidebarNavItem[];
}

export interface SidebarNavRenderLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-current"?: "page" | undefined;
  "aria-label"?: string;
  onClick?: () => void;
}

export interface SidebarNavProps {
  sections: SidebarNavSection[];
  /** Icon-only mode. Section labels hidden; items show tooltip on hover. */
  collapsed?: boolean;
  className?: string;
  itemClassName?: string;
  /** Slot rendered above sections (e.g. logo + workspace switcher). */
  header?: React.ReactNode;
  /** Slot rendered below sections (e.g. theme toggle, sign-out). */
  footer?: React.ReactNode;
  /** When provided, this is used to render link items. Default: <a>. */
  renderLink?: (props: SidebarNavRenderLinkProps) => React.ReactElement;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEM_BASE_CLASSES =
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors";
const ITEM_DEFAULT_CLASSES = "text-foreground hover:bg-accent hover:text-accent-foreground";
const ITEM_ACTIVE_CLASSES = "bg-accent text-accent-foreground font-medium";
const ITEM_DISABLED_CLASSES = "opacity-50 pointer-events-none";
const ITEM_COLLAPSED_CLASSES = "justify-center px-0 w-10 h-10 mx-auto";
const ICON_CLASSES = "h-4 w-4 shrink-0";

function defaultRenderLink({
  href,
  children,
  className,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
  onClick,
}: SidebarNavRenderLinkProps): React.ReactElement {
  return (
    <a
      href={href}
      className={className}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

interface ItemContentProps {
  item: SidebarNavItem;
  collapsed: boolean;
  showChevron?: boolean;
  chevronOpen?: boolean;
}

function ItemContent({
  item,
  collapsed,
  showChevron,
  chevronOpen,
}: ItemContentProps): React.ReactElement {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <>
        {Icon ? <Icon className={ICON_CLASSES} /> : null}
        <span className="sr-only">{item.label}</span>
      </>
    );
  }

  return (
    <>
      {Icon ? <Icon className={ICON_CLASSES} /> : null}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <Badge variant={item.badge.tone} size="sm">
          {item.badge.label}
        </Badge>
      ) : null}
      {showChevron ? (
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            chevronOpen && "rotate-90",
          )}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

interface InteractiveItemProps {
  item: SidebarNavItem;
  collapsed: boolean;
  itemClassName?: string;
  renderLink: (props: SidebarNavRenderLinkProps) => React.ReactElement;
  /** Indent for nested children. */
  nested?: boolean;
}

function InteractiveItem({
  item,
  collapsed,
  itemClassName,
  renderLink,
  nested = false,
}: InteractiveItemProps): React.ReactElement {
  const isActive = item.isActive === true;
  const isDisabled = item.disabled === true;

  const classes = cn(
    ITEM_BASE_CLASSES,
    isActive ? ITEM_ACTIVE_CLASSES : ITEM_DEFAULT_CLASSES,
    isDisabled && ITEM_DISABLED_CLASSES,
    collapsed && ITEM_COLLAPSED_CLASSES,
    !collapsed && nested && "pl-9",
    itemClassName,
  );

  const ariaCurrent = isActive ? "page" : undefined;
  const ariaDisabled = isDisabled ? true : undefined;

  const inner = <ItemContent item={item} collapsed={collapsed} />;

  let element: React.ReactElement;

  if (item.href && !isDisabled) {
    if (item.external) {
      element = (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          aria-current={ariaCurrent}
          aria-label={collapsed ? item.label : undefined}
          onClick={item.onClick}
        >
          {inner}
        </a>
      );
    } else {
      element = renderLink({
        href: item.href,
        className: classes,
        children: inner,
        "aria-current": ariaCurrent,
        "aria-label": collapsed ? item.label : undefined,
        onClick: item.onClick,
      });
    }
  } else {
    element = (
      <button
        type="button"
        className={cn(classes, "w-full text-left")}
        aria-current={ariaCurrent}
        aria-disabled={ariaDisabled}
        aria-label={collapsed ? item.label : undefined}
        disabled={isDisabled}
        onClick={item.onClick}
      >
        {inner}
      </button>
    );
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return element;
}

interface ParentItemProps {
  item: SidebarNavItem;
  collapsed: boolean;
  itemClassName?: string;
  renderLink: (props: SidebarNavRenderLinkProps) => React.ReactElement;
}

function ParentItem({
  item,
  collapsed,
  itemClassName,
  renderLink,
}: ParentItemProps): React.ReactElement {
  const hasActiveChild = React.useMemo(
    () => item.children?.some((c) => c.isActive === true) ?? false,
    [item.children],
  );
  const [open, setOpen] = React.useState<boolean>(item.isActive === true || hasActiveChild);

  // If collapsed, render parent as a flat icon-only item with tooltip (no nested expansion).
  if (collapsed) {
    return (
      <InteractiveItem
        item={item}
        collapsed
        itemClassName={itemClassName}
        renderLink={renderLink}
      />
    );
  }

  const isActive = item.isActive === true;
  const isDisabled = item.disabled === true;

  const triggerClasses = cn(
    ITEM_BASE_CLASSES,
    "w-full text-left",
    isActive ? ITEM_ACTIVE_CLASSES : ITEM_DEFAULT_CLASSES,
    isDisabled && ITEM_DISABLED_CLASSES,
    itemClassName,
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={triggerClasses}
        aria-current={isActive ? "page" : undefined}
        disabled={isDisabled}
      >
        <ItemContent item={item} collapsed={false} showChevron chevronOpen={open} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 flex flex-col gap-0.5">
          {item.children?.map((child) => (
            <li key={child.id}>
              <InteractiveItem
                item={child}
                collapsed={false}
                itemClassName={itemClassName}
                renderLink={renderLink}
                nested
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SidebarNav({
  sections,
  collapsed = false,
  className,
  itemClassName,
  header,
  footer,
  renderLink = defaultRenderLink,
}: SidebarNavProps): React.ReactElement {
  return (
    <TooltipProvider delayDuration={200}>
      <nav
        aria-label="Sidebar"
        className={cn(
          "flex h-full flex-col gap-4",
          collapsed ? "px-2 py-3" : "px-3 py-4",
          className,
        )}
      >
        {header ? <div className="shrink-0">{header}</div> : null}

        <div className="flex-1 space-y-6 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.id}>
              {section.label && !collapsed ? (
                <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  return (
                    <li key={item.id}>
                      {hasChildren ? (
                        <ParentItem
                          item={item}
                          collapsed={collapsed}
                          itemClassName={itemClassName}
                          renderLink={renderLink}
                        />
                      ) : (
                        <InteractiveItem
                          item={item}
                          collapsed={collapsed}
                          itemClassName={itemClassName}
                          renderLink={renderLink}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {footer ? <div className="shrink-0 border-t border-border pt-3">{footer}</div> : null}
      </nav>
    </TooltipProvider>
  );
}

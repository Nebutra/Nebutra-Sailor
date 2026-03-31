"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface ContextMenuItemProps {
  /** Menu item label */
  children?: React.ReactNode;
  /**
   * Called when the item is selected (click or keyboard Enter/Space).
   * Maps to Radix's onSelect — fires for both pointer and keyboard interactions.
   * When `href` is set, navigation itself is the selection action and onSelect is not wired.
   */
  onSelect?: (event: Event | React.SyntheticEvent) => void;
  /** Disable the item */
  disabled?: boolean;
  /** Navigate to this URL when selected (renders as <a>) */
  href?: string;
  /** Element rendered before the label (icon, avatar, etc.) */
  prefix?: React.ReactNode;
  /** Element rendered after the label (shortcut, badge, etc.) */
  suffix?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface ContextMenuLabelProps {
  children?: React.ReactNode;
  className?: string;
}

export interface ContextMenuSeparatorProps {
  className?: string;
}

export interface ContextMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseContextMenu.Popup> {
  align?: React.ComponentProps<typeof BaseContextMenu.Positioner>["align"];
  sideOffset?: React.ComponentProps<typeof BaseContextMenu.Positioner>["sideOffset"];
  alignOffset?: React.ComponentProps<typeof BaseContextMenu.Positioner>["alignOffset"];
  side?: React.ComponentProps<typeof BaseContextMenu.Positioner>["side"];
}

// =============================================================================
// ContextMenuRoot
// =============================================================================

export const ContextMenuRoot = BaseContextMenu.Root;

// =============================================================================
// ContextMenuTrigger
// =============================================================================

export const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Trigger>,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & { asChild?: boolean }
>(({ asChild, children, render, ...props }, ref) => {
  const renderElement = asChild && React.isValidElement(children) ? children : render;
  return (
    <BaseContextMenu.Trigger
      ref={ref}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render={renderElement as any}
      {...(renderElement ? props : { ...props, children })}
    />
  );
});
ContextMenuTrigger.displayName = "ContextMenu.Trigger";

// =============================================================================
// ContextMenuContent
// =============================================================================

// =============================================================================
// ContextMenuContent
// =============================================================================

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Popup>,
  ContextMenuContentProps
>(
  (
    { className, alignOffset = 0, align = "start", sideOffset = 4, side = "bottom", ...props },
    ref,
  ) => (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner
        alignOffset={alignOffset}
        align={align}
        sideOffset={sideOffset}
        side={side}
      >
        <BaseContextMenu.Popup
          ref={ref}
          className={cn(
            "z-50 min-w-40 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md",
            "p-1 text-popover-foreground shadow-xl transition-all outline-none",
            "data-[starting-style]:zoom-out-95 data-[ending-style]:zoom-out-95",
            "data-[starting-style]:fade-out-0 data-[ending-style]:fade-out-0",
            className,
          )}
          {...props}
        />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  ),
);
ContextMenuContent.displayName = "ContextMenu.Content";

// =============================================================================
// ContextMenuGroup
// =============================================================================

export const ContextMenuGroup = BaseContextMenu.Group;
ContextMenuGroup.displayName = "ContextMenu.Group";

// =============================================================================
// ContextMenuLabel
// =============================================================================

export const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.GroupLabel>,
  ContextMenuLabelProps
>(({ className, ...props }, ref) => (
  <BaseContextMenu.GroupLabel
    ref={ref}
    className={cn("px-2 py-1 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = "ContextMenu.Label";

// =============================================================================
// ContextMenuSeparator
// =============================================================================

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Separator>,
  ContextMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <BaseContextMenu.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = "ContextMenu.Separator";

// =============================================================================
// ContextMenuItem
// =============================================================================

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Item>,
  ContextMenuItemProps
>(({ children, onSelect, disabled, href, prefix, suffix, className }, ref) => {
  const inner = (
    <>
      {prefix && (
        <span className="mr-2 flex shrink-0 items-center text-muted-foreground">{prefix}</span>
      )}
      <span className="flex-1">{children}</span>
      {suffix && (
        <span className="ml-auto flex shrink-0 items-center text-muted-foreground">{suffix}</span>
      )}
    </>
  );

  return (
    <BaseContextMenu.Item
      ref={ref}
      {...(disabled !== undefined && { disabled })}
      {...(onSelect && !href ? { onClick: (e) => onSelect(e) } : {})}
      {...(href
        ? {
            render: <a href={href} aria-label={typeof children === "string" ? children : "Link"} />,
          }
        : {})}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] px-2 py-1.5",
        "text-sm outline-none transition-colors",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      {inner}
    </BaseContextMenu.Item>
  );
});
ContextMenuItem.displayName = "ContextMenu.Item";

// =============================================================================
// Compound Export
// =============================================================================

/**
 * ContextMenu — Geist-style right-click context menu.
 *
 * @example
 * ```tsx
 * <ContextMenu.Root>
 *   <ContextMenu.Trigger asChild>
 *     <div className="rounded border p-8">Right-click here</div>
 *   </ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item onSelect={() => {}}>Edit</ContextMenu.Item>
 *     <ContextMenu.Item onSelect={() => {}}>Delete</ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu.Root>
 * ```
 */
export const ContextMenu = {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Group: ContextMenuGroup,
  Item: ContextMenuItem,
  Label: ContextMenuLabel,
  Separator: ContextMenuSeparator,
} as const;

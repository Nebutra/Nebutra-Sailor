"use client";

/**
 * Menubar — the desktop-app menu row (File / Edit / View…), built on Base UI
 * Menubar + Menu.
 *
 * https://base-ui.com/react/components/menubar ·
 * https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 *
 * Base UI owns the APG contract, so this file only styles it:
 *   ← / →         move between top-level triggers (focus loops)
 *   ↓ / Enter     open the focused menu and focus its first item
 *   ↑ / ↓         move within a menu; → / ← open / close a submenu
 *   a–z           typeahead to a matching item
 *   Esc           close the menu and return focus to its trigger
 *   hover         once one menu is open, hovering a sibling trigger switches
 *
 * Every trigger carries role="menuitem", aria-haspopup and aria-expanded; the
 * popups are portalled and positioned by the shared overlay layer.
 */

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Menubar as BaseMenubar } from "@base-ui/react/menubar";
import { Check, ChevronRight, Status as Circle } from "@nebutra/icons";
import type * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

// Base UI marks an open trigger with `data-popup-open`; the shared menubar
// classes were written against `data-state=open`. Map one onto the other here
// so the visual contract in overlay.ts stays the single source.
const OPEN_STATE_CLASSNAME =
  "data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

const Menubar = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenubar> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <BaseMenubar
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menubarRoot, className)}
    {...props}
  />
);
Menubar.displayName = "Menubar";

/** One top-level menu: a `MenubarTrigger` and its `MenubarContent`. */
const MenubarMenu = (props: React.ComponentProps<typeof BaseMenu.Root>) => (
  <BaseMenu.Root {...props} />
);
MenubarMenu.displayName = "MenubarMenu";

const MenubarPortal = BaseMenu.Portal;

const MenubarGroup = BaseMenu.Group;

const MenubarTrigger = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger> & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => (
  <BaseMenu.Trigger
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menubarTrigger, OPEN_STATE_CLASSNAME, className)}
    {...props}
  />
);
MenubarTrigger.displayName = "MenubarTrigger";

const MenubarSub = (props: React.ComponentProps<typeof BaseMenu.SubmenuRoot>) => (
  <BaseMenu.SubmenuRoot {...props} />
);
MenubarSub.displayName = "MenubarSub";

const MenubarSubTrigger = ({
  className,
  inset,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.SubmenuTrigger> & { inset?: boolean } & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseMenu.SubmenuTrigger
    ref={ref}
    className={cn(
      overlayPrimitiveClassNames.menubarSubTrigger,
      OPEN_STATE_CLASSNAME,
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4" />
  </BaseMenu.SubmenuTrigger>
);
MenubarSubTrigger.displayName = "MenubarSubTrigger";

type PositionerProps = React.ComponentProps<typeof BaseMenu.Positioner>;

export interface MenubarContentProps extends React.ComponentProps<typeof BaseMenu.Popup> {
  align?: PositionerProps["align"];
  alignOffset?: PositionerProps["alignOffset"];
  side?: PositionerProps["side"];
  sideOffset?: PositionerProps["sideOffset"];
}

const MenubarContent = ({
  className,
  align = "start",
  alignOffset = -4,
  side = "bottom",
  sideOffset = 8,
  style,
  ref,
  ...props
}: MenubarContentProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      style={{ zIndex: overlayZIndex.popover }}
    >
      <BaseMenu.Popup
        ref={ref}
        className={cn(
          overlayClassNames.menuSurface,
          overlayPrimitiveClassNames.menuSurface,
          "min-w-[12rem]",
          className,
        )}
        style={{ zIndex: overlayZIndex.popover, ...style }}
        {...props}
      />
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
);
MenubarContent.displayName = "MenubarContent";

const MenubarSubContent = ({
  className,
  sideOffset = 4,
  alignOffset = -4,
  ...props
}: MenubarContentProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <MenubarContent
    side="right"
    sideOffset={sideOffset}
    alignOffset={alignOffset}
    className={cn("min-w-[8rem]", className)}
    {...props}
  />
);
MenubarSubContent.displayName = "MenubarSubContent";

const MenubarItem = ({
  className,
  inset,
  asChild,
  children,
  render,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item> & {
  inset?: boolean;
  /** Render the child element (e.g. a router Link) as the item. */
  asChild?: boolean;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const childElement =
    asChild && children && typeof children === "object" && "props" in children
      ? (children as React.ReactElement)
      : undefined;
  return (
    <BaseMenu.Item
      ref={ref}
      render={childElement ?? render}
      className={cn(
        overlayPrimitiveClassNames.menuItem,
        "data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {childElement ? undefined : children}
    </BaseMenu.Item>
  );
};
MenubarItem.displayName = "MenubarItem";

const MenubarCheckboxItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.CheckboxItem> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseMenu.CheckboxItem
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menuCheckboxItem, className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseMenu.CheckboxItemIndicator>
        <Check aria-hidden="true" className="h-4 w-4" />
      </BaseMenu.CheckboxItemIndicator>
    </span>
    {children}
  </BaseMenu.CheckboxItem>
);
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

const MenubarRadioGroup = BaseMenu.RadioGroup;

const MenubarRadioItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.RadioItem> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseMenu.RadioItem
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menuCheckboxItem, className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseMenu.RadioItemIndicator>
        <Circle aria-hidden="true" className="h-2 w-2 fill-current" />
      </BaseMenu.RadioItemIndicator>
    </span>
    {children}
  </BaseMenu.RadioItem>
);
MenubarRadioItem.displayName = "MenubarRadioItem";

const MenubarLabel = ({
  className,
  inset,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean } & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
);
MenubarLabel.displayName = "MenubarLabel";

const MenubarSeparator = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Separator> & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseMenu.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
);
MenubarSeparator.displayName = "MenubarSeparator";

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
};
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};

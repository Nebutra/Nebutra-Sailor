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
 *                 (← / → swap under dir="rtl": the bar measures its own direction and hands
 *                 it to Base UI, which only reads direction from its provider, not the DOM)
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
import * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import {
  BaseDirectionScope,
  mergeRefs,
  type TextDirection,
  useResolvedDirection,
} from "../utils/direction";
import { overlayPrimitiveClassNames } from "./overlay";

// Base UI marks an open trigger with `data-popup-open`; the shared menubar
// classes were written against `data-state=open`. Map one onto the other here
// so the visual contract in overlay.ts stays the single source.
const OPEN_STATE_CLASSNAME =
  "data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

// Base UI marks a disabled trigger (its own prop, or the whole bar's) with
// `data-disabled`; the shared menubar classes had no disabled treatment, so a
// disabled menu looked live and still took the hover highlight.
const DISABLED_TRIGGER_CLASSNAME = "data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

// Direction measured on the bar, read by every popup it opens. Undefined outside a Menubar so a
// stray MenubarContent never forces `dir` onto the page.
const MenubarDirectionContext = React.createContext<TextDirection | undefined>(undefined);

/**
 * Horizontal bar of top-level menus. Owns roving focus across its triggers and the hover
 * hand-off between menus once one is open. Under `dir="rtl"` (set `dir` on the bar or any
 * ancestor) the left and right arrow keys swap, and submenus open towards the inline end.
 */
const Menubar = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenubar> & { ref?: React.Ref<HTMLDivElement> | undefined }) => {
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const direction = useResolvedDirection(barRef);
  // Memoised so Base UI does not see a new callback ref on every render.
  const mergedRef = React.useMemo(() => mergeRefs(ref, barRef), [ref]);
  return (
    <MenubarDirectionContext.Provider value={direction}>
      <BaseDirectionScope direction={direction}>
        <BaseMenubar
          ref={mergedRef}
          className={cn(overlayPrimitiveClassNames.menubarRoot, className)}
          {...props}
        />
      </BaseDirectionScope>
    </MenubarDirectionContext.Provider>
  );
};
Menubar.displayName = "Menubar";

/** One top-level menu: a `MenubarTrigger` and its `MenubarContent`. */
const MenubarMenu = (props: React.ComponentProps<typeof BaseMenu.Root>) => (
  <BaseMenu.Root {...props} />
);
MenubarMenu.displayName = "MenubarMenu";

/** Portal for menu content. `MenubarContent` already wraps itself in one. */
const MenubarPortal = BaseMenu.Portal;

/** Groups related items so assistive tech announces them together. */
const MenubarGroup = BaseMenu.Group;

/** Top-level button that opens its menu. Set `disabled` to make it inert. */
const MenubarTrigger = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger> & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => (
  <BaseMenu.Trigger
    ref={ref}
    className={cn(
      overlayPrimitiveClassNames.menubarTrigger,
      OPEN_STATE_CLASSNAME,
      DISABLED_TRIGGER_CLASSNAME,
      className,
    )}
    {...props}
  />
);
MenubarTrigger.displayName = "MenubarTrigger";

/** Wraps a `MenubarSubTrigger` and its `MenubarSubContent` to form a nested submenu. */
const MenubarSub = (props: React.ComponentProps<typeof BaseMenu.SubmenuRoot>) => (
  <BaseMenu.SubmenuRoot {...props} />
);
MenubarSub.displayName = "MenubarSub";

/** Item that opens a nested submenu, with a trailing chevron that mirrors in RTL. */
const MenubarSubTrigger = ({
  className,
  inset,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.SubmenuTrigger> & {
  /** Indent the label to line up with items that carry a check or radio indicator. */
  inset?: boolean;
} & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseMenu.SubmenuTrigger
    ref={ref}
    className={cn(
      overlayPrimitiveClassNames.menubarSubTrigger,
      OPEN_STATE_CLASSNAME,
      inset && "ps-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight aria-hidden="true" className="ms-auto h-4 w-4 rtl:rotate-180" />
  </BaseMenu.SubmenuTrigger>
);
MenubarSubTrigger.displayName = "MenubarSubTrigger";

type PositionerProps = React.ComponentProps<typeof BaseMenu.Positioner>;

// Carries the bar's measured direction onto the portalled popup, so floating-ui flips the
// alignment and the `rtl:` variants inside the menu match, even when `dir` sits on a wrapper
// that the portal escapes.
const MenubarPositioner = (props: PositionerProps) => {
  const direction = React.use(MenubarDirectionContext);
  return (
    <BaseMenu.Positioner dir={direction} style={{ zIndex: overlayZIndex.popover }} {...props} />
  );
};

export interface MenubarContentProps extends React.ComponentProps<typeof BaseMenu.Popup> {
  /**
   * Alignment of the panel against its trigger along the edge it opens from.
   * @default "start"
   */
  align?: PositionerProps["align"];
  /**
   * Extra offset along the alignment axis, in px.
   * @default -4
   */
  alignOffset?: PositionerProps["alignOffset"];
  /**
   * Edge of the trigger the panel opens from.
   * @default "bottom"
   */
  side?: PositionerProps["side"];
  /**
   * Gap between the trigger and the panel, in px.
   * @default 8
   */
  sideOffset?: PositionerProps["sideOffset"];
}

/** Portalled, positioned panel that holds a menu's items. */
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
    <MenubarPositioner align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
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
    </MenubarPositioner>
  </BaseMenu.Portal>
);
MenubarContent.displayName = "MenubarContent";

/**
 * Panel for a nested submenu. Opens on the inline-end side of its `MenubarSubTrigger`: to the
 * right in LTR and to the left in RTL.
 */
const MenubarSubContent = ({
  className,
  sideOffset = 4,
  alignOffset = -4,
  ...props
}: MenubarContentProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <MenubarContent
    side="inline-end"
    sideOffset={sideOffset}
    alignOffset={alignOffset}
    className={cn("min-w-[8rem]", className)}
    {...props}
  />
);
MenubarSubContent.displayName = "MenubarSubContent";

/** Selectable menu row. Use `asChild` to render a link, and `disabled` to dim it and ignore presses. */
const MenubarItem = ({
  className,
  inset,
  asChild,
  children,
  render,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item> & {
  /** Indent the label to line up with items that carry a check or radio indicator. */
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
        inset && "ps-8",
        className,
      )}
      {...props}
    >
      {childElement ? undefined : children}
    </BaseMenu.Item>
  );
};
MenubarItem.displayName = "MenubarItem";

/** Item that toggles a boolean setting and shows a check while `checked`. */
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
    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseMenu.CheckboxItemIndicator>
        <Check aria-hidden="true" className="h-4 w-4" />
      </BaseMenu.CheckboxItemIndicator>
    </span>
    {children}
  </BaseMenu.CheckboxItem>
);
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

/** Holds the `value` shared by a set of `MenubarRadioItem`s. */
const MenubarRadioGroup = BaseMenu.RadioGroup;

/** One choice in a `MenubarRadioGroup`, marked with a dot while selected. */
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
    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseMenu.RadioItemIndicator>
        <Circle aria-hidden="true" className="h-2 w-2 fill-current" />
      </BaseMenu.RadioItemIndicator>
    </span>
    {children}
  </BaseMenu.RadioItem>
);
MenubarRadioItem.displayName = "MenubarRadioItem";

/** Non-interactive heading for a run of items. */
const MenubarLabel = ({
  className,
  inset,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Indent the label to line up with items that carry a check or radio indicator. */
  inset?: boolean;
} & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "ps-8", className)}
    {...props}
  />
);
MenubarLabel.displayName = "MenubarLabel";

/** Hairline between groups of items. */
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

/** End-aligned shortcut hint for an item. Decorative: it does not bind the keys itself. */
const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ms-auto text-xs tracking-widest text-muted-foreground", className)}
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

"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Check, ChevronRight, Status as Circle } from "@nebutra/icons";
import { usePortalContainer } from "@nebutra/ui/utils/portal-container";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import {
  BaseDirectionScope,
  mergeRefs,
  type TextDirection,
  useResolvedDirection,
} from "../utils/direction";
import { resolveLazyChild } from "../utils/lazy-child";
import { rendersNativeButton } from "../utils/native-button";
import { overlayPrimitiveClassNames } from "./overlay";

type PortalContainer = React.ComponentProps<typeof BaseMenu.Portal>["container"];

type DropdownMenuContextValue = {
  setOpen: (open: boolean) => void;
  /** Trigger element the reading direction is measured from. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** Reading direction applied to the popups and handed to Base UI for arrow keys. */
  direction: TextDirection;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

type DropdownMenuProps = React.ComponentPropsWithoutRef<typeof BaseMenu.Root> & {
  /**
   * Reading direction used to mirror the submenu arrow keys (`ArrowLeft` opens a submenu in
   * `rtl`) and the side submenus open on. Leave it out to follow the `dir` in effect around the
   * trigger (an ancestor `dir` attribute, else CSS `direction`); set it when the menu has no
   * trigger to measure from.
   * @default "the direction around the trigger"
   */
  dir?: TextDirection;
};

/**
 * Coordinates a menu trigger, popup, keyboard navigation, and controlled open state. Under
 * `dir="rtl"` the submenu arrow keys, the side submenus open on and the popup's own `dir` all
 * mirror.
 */
function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  dir: dirProp,
  children,
  ...props
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const measuredDirection = useResolvedDirection(triggerRef);
  const direction = dirProp ?? measuredDirection;

  function setOpen(
    nextOpen: boolean,
    eventDetails?: Parameters<NonNullable<DropdownMenuProps["onOpenChange"]>>[1],
  ) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen, eventDetails as never);
  }

  const contextValue: DropdownMenuContextValue = { setOpen, triggerRef, direction };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <BaseDirectionScope direction={direction}>
        <BaseMenu.Root open={open} onOpenChange={setOpen} {...props}>
          {children}
        </BaseMenu.Root>
      </BaseDirectionScope>
    </DropdownMenuContext.Provider>
  );
}
DropdownMenu.displayName = "DropdownMenu";

type DropdownMenuTriggerProps = React.ComponentProps<typeof BaseMenu.Trigger> & {
  /** Uses a single valid child element as the trigger instead of creating a button. */
  asChild?: boolean;
};

/** Opens the menu, optionally applying trigger behavior to a single child element. */
const DropdownMenuTrigger = ({
  asChild,
  children: rawChildren,
  render,
  ref,
  ...props
}: DropdownMenuTriggerProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const children = resolveLazyChild(rawChildren);
  const context = React.use(DropdownMenuContext);
  const triggerRef = context?.triggerRef;
  // Memoised: a fresh callback ref every render would detach and re-register the trigger in Base UI.
  const mergedRef = React.useMemo(() => mergeRefs(ref, triggerRef), [ref, triggerRef]);
  function openFromTrigger() {
    context?.setOpen(true);
  }

  const childRenderElement =
    asChild && React.isValidElement<Record<string, unknown>>(children)
      ? React.cloneElement(children, {
          onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
            (
              children.props.onMouseDown as
                | ((event: React.MouseEvent<HTMLElement>) => void)
                | undefined
            )?.(event);
            if (!event.defaultPrevented) {
              openFromTrigger();
            }
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
            (
              children.props.onKeyDown as
                | ((event: React.KeyboardEvent<HTMLElement>) => void)
                | undefined
            )?.(event);
            if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
              openFromTrigger();
            }
          },
        })
      : null;

  const renderElement = childRenderElement ?? render;
  return (
    <BaseMenu.Trigger
      ref={mergedRef}
      render={renderElement as React.ComponentProps<typeof BaseMenu.Trigger>["render"]}
      nativeButton={rendersNativeButton(renderElement)}
      {...(renderElement ? props : { ...props, children })}
    />
  );
};
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuGroup = BaseMenu.Group;

const DropdownMenuPortal = BaseMenu.Portal;

const DropdownMenuSub = BaseMenu.SubmenuRoot;

const DropdownMenuRadioGroup = BaseMenu.RadioGroup;

const DropdownMenuSubTrigger = ({
  className,
  inset,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {
  inset?: boolean;
} & { ref?: React.Ref<React.ElementRef<typeof BaseMenu.SubmenuTrigger>> | undefined }) => (
  <BaseMenu.SubmenuTrigger
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menuSubTrigger, inset && "ps-8", className)}
    {...props}
  >
    {children}
    <ChevronRight aria-hidden="true" className="ms-auto size-4 rtl:rotate-180" />
  </BaseMenu.SubmenuTrigger>
);
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = ({
  className,
  style,
  container,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
  /** Portal target; defaults to the active fullscreen element, else <body>. */
  container?: PortalContainer;
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.Popup>> | undefined;
}) => {
  const portalContainer = usePortalContainer(container);
  const direction = React.use(DropdownMenuContext)?.direction;
  return (
    <BaseMenu.Portal container={portalContainer}>
      <BaseMenu.Positioner dir={direction} style={{ zIndex: overlayZIndex.popover }}>
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            overlayClassNames.menuSurface,
            overlayPrimitiveClassNames.menuSurface,
            className,
          )}
          style={{ zIndex: overlayZIndex.popover, ...style }}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
};
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  /** Alignment of the popup along the trigger's side. */
  align?: React.ComponentProps<typeof BaseMenu.Positioner>["align"];
  /** Distance from the trigger, in pixels or a Base UI offset callback. */
  sideOffset?: React.ComponentProps<typeof BaseMenu.Positioner>["sideOffset"];
  /** Offset along the alignment axis, in pixels or a Base UI offset callback. */
  alignOffset?: React.ComponentProps<typeof BaseMenu.Positioner>["alignOffset"];
  /** Preferred side of the trigger; collision handling may choose another side. */
  side?: React.ComponentProps<typeof BaseMenu.Positioner>["side"];
  /** Portal target; defaults to the active fullscreen element, else <body>. */
  container?: PortalContainer;
}

/** Portals and positions the styled menu popup relative to DropdownMenuTrigger. */
const DropdownMenuContent = ({
  className,
  style,
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  container,
  ref,
  ...props
}: DropdownMenuContentProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.Popup>> | undefined;
}) => {
  const portalContainer = usePortalContainer(container);
  const direction = React.use(DropdownMenuContext)?.direction;
  return (
    <BaseMenu.Portal container={portalContainer}>
      <BaseMenu.Positioner
        dir={direction}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        side={side}
        style={{ zIndex: overlayZIndex.popover }}
      >
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            overlayClassNames.menuSurface,
            overlayPrimitiveClassNames.menuSurface,
            className,
          )}
          style={{ zIndex: overlayZIndex.popover, ...style }}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
};
DropdownMenuContent.displayName = "DropdownMenuContent";

/** Renders one selectable menu action, optionally inset to align with labeled content. */
const DropdownMenuItem = ({
  className,
  inset,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {
  /** Adds leading inset space for alignment with menu icons or checkmarks. */
  inset?: boolean;
} & { ref?: React.Ref<React.ElementRef<typeof BaseMenu.Item>> | undefined }) => (
  <BaseMenu.Item
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menuItem, inset && "ps-8", className)}
    {...props}
  />
);
DropdownMenuItem.displayName = "DropdownMenuItem";

/** Renders a menu item whose checked state is represented by a check indicator. */
const DropdownMenuCheckboxItem = ({
  className,
  children,
  checked,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem> & {
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.CheckboxItem>> | undefined;
}) => (
  <BaseMenu.CheckboxItem
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menuCheckboxItem, className)}
    {...(checked !== undefined && { checked })}
    {...props}
  >
    <span className="absolute start-2 flex size-3.5 items-center justify-center">
      <BaseMenu.CheckboxItemIndicator>
        <Check className="size-4" />
      </BaseMenu.CheckboxItemIndicator>
    </span>
    {children}
  </BaseMenu.CheckboxItem>
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem> & {
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.RadioItem>> | undefined;
}) => (
  <BaseMenu.RadioItem
    ref={ref}
    className={cn(overlayPrimitiveClassNames.menuCheckboxItem, className)}
    {...props}
  >
    <span className="absolute start-2 flex size-3.5 items-center justify-center">
      <BaseMenu.RadioItemIndicator>
        <Circle className="size-2 fill-current" />
      </BaseMenu.RadioItemIndicator>
    </span>
    {children}
  </BaseMenu.RadioItem>
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const MENU_RESERVED_KEYS = new Set(["ArrowUp", "ArrowDown", "Enter", "Tab"]);

/**
 * Text filter for a long menu (language wheels, workspace lists).
 *
 * Menu popups own every printable keystroke: Base UI wires `useTypeahead` on the
 * popup and calls `preventDefault()` + `stopPropagation()` for any single
 * character key, so a bare `<input>` dropped into menu content cannot be typed
 * into at all. This primitive is the supported way to put one there — it stops
 * the keydown before the popup's typeahead and list-navigation handlers see it,
 * while deliberately letting ArrowUp / ArrowDown / Enter / Tab through so the
 * keyboard path from the filter into the filtered items still works. Escape is
 * unaffected either way: dismissal is bound on `document`, not on the popup.
 */
const DropdownMenuFilterInput = ({
  className,
  onKeyDown,
  ref,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"input">, "type"> & {
  ref?: React.Ref<HTMLInputElement> | undefined;
}) => (
  <input
    ref={ref}
    type="search"
    className={cn(overlayPrimitiveClassNames.menuFilterInput, className)}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      // Caret keys and printable characters belong to the field, not the menu.
      // Arrow up/down, Enter and Tab stay with the menu so the keyboard path
      // out of the filter and into the filtered items is preserved.
      if (!MENU_RESERVED_KEYS.has(event.key)) {
        event.stopPropagation();
      }
    }}
    {...props}
  />
);
DropdownMenuFilterInput.displayName = "DropdownMenuFilterInput";

/** Shown in place of items when a `DropdownMenuFilterInput` matches nothing. */
const DropdownMenuEmpty = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    role="presentation"
    className={cn(overlayPrimitiveClassNames.menuEmpty, className)}
    {...props}
  />
);
DropdownMenuEmpty.displayName = "DropdownMenuEmpty";

/** Renders non-interactive menu heading text, optionally aligned with inset items. */
const DropdownMenuLabel = ({
  className,
  inset,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Adds leading inset space to align the label with menu item content. */
  inset?: boolean;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "ps-8", className)}
    {...props}
  />
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

/** Visually separates related menu item groups. */
const DropdownMenuSeparator = ({
  className,
  orientation = "horizontal",
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.Separator> & {
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.Separator>> | undefined;
}) => (
  <BaseMenu.Separator
    ref={ref}
    orientation={orientation}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/** Displays a keyboard shortcut hint at the end of a menu item. */
const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn("ms-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuFilterInput,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};

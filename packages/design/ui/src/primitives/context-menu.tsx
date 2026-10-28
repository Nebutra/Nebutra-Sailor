"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { Check, ChevronRight } from "@nebutra/icons";
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
import { overlayPrimitiveClassNames } from "./overlay";

type ContextMenuItemVariant = "default" | "destructive";

export interface ContextMenuItemProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item>,
    "disabled" | "label" | "closeOnClick"
  > {
  /** Label content of the item. */
  children?: React.ReactNode;
  /** Called when the item is clicked or chosen with the keyboard. Mapped onto `onClick`. */
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item>["onClick"];
  /** Renders the item as a link to this URL instead of a button-like row. */
  href?: string;
  /** Where a linked item opens. Only used with `href`. */
  target?: React.HTMLAttributeAnchorTarget;
  /** Link relationship for a linked item. Only used with `href`. */
  rel?: string;
  /** Leading content, usually an icon, shown before the label in the muted colour. */
  prefix?: React.ReactNode;
  /** Trailing content, usually a `ContextMenuShortcut`, pushed to the end of the row. */
  suffix?: React.ReactNode;
  /**
   * Visual intent. `destructive` colours the row with the danger tone.
   * @default "default"
   */
  variant?: ContextMenuItemVariant;
  /** Written to the row as `data-value`, for tests and styling hooks. */
  value?: string;
  /** Additional classes for the row. */
  className?: string;
}

export interface ContextMenuCheckboxItemProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem>,
    "checked" | "defaultChecked" | "disabled" | "label" | "closeOnClick" | "onCheckedChange"
  > {
  /** Label content of the item. */
  children?: React.ReactNode;
  /** Leading content, usually an icon, shown before the label in the muted colour. */
  prefix?: React.ReactNode;
  /** Trailing content, usually a `ContextMenuShortcut`, pushed to the end of the row. */
  suffix?: React.ReactNode;
  /** Called when the item is clicked or chosen with the keyboard. Mapped onto `onClick`. */
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem>["onClick"];
  /** Written to the row as `data-value`, for tests and styling hooks. */
  value?: string;
  /** Additional classes for the row. */
  className?: string;
}

export interface ContextMenuRadioGroupProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioGroup>,
    "value" | "defaultValue" | "onValueChange"
  > {
  /** The selected radio value when controlled. */
  value?: string;
  /** The radio value selected at first when uncontrolled. */
  defaultValue?: string;
  /** Called with the new value when the user picks a different radio item. */
  onValueChange?: (
    value: string,
    eventDetails: Parameters<
      NonNullable<
        React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioGroup>["onValueChange"]
      >
    >[1],
  ) => void;
}

export interface ContextMenuRadioItemProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioItem>,
    "disabled" | "label" | "closeOnClick"
  > {
  /** Label content of the item. */
  children?: React.ReactNode;
  /** The value this item sets on its `ContextMenuRadioGroup` when chosen. */
  value: string;
  /** Leading content, usually an icon, shown before the label in the muted colour. */
  prefix?: React.ReactNode;
  /** Trailing content, usually a `ContextMenuShortcut`, pushed to the end of the row. */
  suffix?: React.ReactNode;
  /** Called when the item is clicked or chosen with the keyboard. Mapped onto `onClick`. */
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioItem>["onClick"];
  /** Additional classes for the row. */
  className?: string;
}

export interface ContextMenuSubTriggerProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger>,
    "disabled" | "label" | "delay" | "closeDelay" | "openOnHover"
  > {
  /** Label content of the row. */
  children?: React.ReactNode;
  /** Leading content, usually an icon, shown before the label in the muted colour. */
  prefix?: React.ReactNode;
  /** Trailing content. Defaults to a chevron towards the submenu: right in LTR, left in RTL. */
  suffix?: React.ReactNode;
  /** Called when the row is clicked. Mapped onto `onClick`. */
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger>["onClick"];
  /** Additional classes for the row. */
  className?: string;
}

export interface ContextMenuLabelProps {
  /** Heading text for the run of items below it. */
  children?: React.ReactNode;
  /** Additional classes for the label. */
  className?: string;
}

export interface ContextMenuSeparatorProps {
  /** Additional classes for the divider. */
  className?: string;
}

export interface ContextMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseContextMenu.Popup> {
  /**
   * Alignment of the panel against the pointer along the edge it opens from.
   * @default "start"
   */
  align?: React.ComponentProps<typeof BaseContextMenu.Positioner>["align"];
  /**
   * Gap between the pointer and the panel, in px.
   * @default 4
   */
  sideOffset?: React.ComponentProps<typeof BaseContextMenu.Positioner>["sideOffset"];
  /**
   * Extra offset along the alignment axis, in px.
   * @default 0
   */
  alignOffset?: React.ComponentProps<typeof BaseContextMenu.Positioner>["alignOffset"];
  /**
   * Edge of the pointer the panel opens from.
   * @default "bottom"
   */
  side?: React.ComponentProps<typeof BaseContextMenu.Positioner>["side"];
}

function ContextMenuItemContent({
  children,
  prefix,
  suffix,
  inset = false,
}: {
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inset?: boolean;
}) {
  return (
    <>
      {prefix && <span className="flex shrink-0 items-center text-muted-foreground">{prefix}</span>}
      {!prefix && inset && <span aria-hidden="true" className="size-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {suffix && (
        <span className="ms-auto flex shrink-0 items-center text-muted-foreground">{suffix}</span>
      )}
    </>
  );
}

export interface ContextMenuRootProps
  extends React.ComponentPropsWithoutRef<typeof BaseContextMenu.Root> {
  /**
   * Reading direction used to mirror the submenu arrow keys (`ArrowLeft` opens a submenu in
   * `rtl`) and the side submenus open on. Leave it out to follow the `dir` in effect around the
   * `ContextMenuTrigger` (an ancestor `dir` attribute, else CSS `direction`).
   * @default "the direction around the trigger"
   */
  dir?: TextDirection;
}

type ContextMenuDirectionValue = {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  direction: TextDirection;
};

// Undefined outside a ContextMenuRoot so a stray part never forces `dir` onto the page.
const ContextMenuDirectionContext = React.createContext<ContextMenuDirectionValue | undefined>(
  undefined,
);

/**
 * Holds the open state of one context menu. Renders no element of its own. It measures the
 * reading direction around its trigger and hands it to Base UI, so under `dir="rtl"` the
 * submenu arrow keys and the side submenus open on mirror.
 */
export const ContextMenuRoot = ({ dir: dirProp, children, ...props }: ContextMenuRootProps) => {
  const triggerRef = React.useRef<HTMLDivElement | null>(null);
  const measuredDirection = useResolvedDirection(triggerRef);
  const direction = dirProp ?? measuredDirection;
  const value = React.useMemo(() => ({ triggerRef, direction }), [direction]);
  return (
    <ContextMenuDirectionContext.Provider value={value}>
      <BaseDirectionScope direction={direction}>
        <BaseContextMenu.Root {...props}>{children}</BaseContextMenu.Root>
      </BaseDirectionScope>
    </ContextMenuDirectionContext.Provider>
  );
};
ContextMenuRoot.displayName = "ContextMenu.Root";

/**
 * Region that opens the menu on right click, or on a long press on touch. It renders a plain
 * `<div>` that is not focusable, so wrap a focusable element with `asChild` if keyboard users
 * need to reach it.
 */
export const ContextMenuTrigger = ({
  asChild,
  children: rawChildren,
  render,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & {
  /** Render the child element as the trigger region instead of a wrapping `<div>`. */
  asChild?: boolean;
} & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.Trigger>> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  const triggerRef = React.use(ContextMenuDirectionContext)?.triggerRef;
  // Memoised so Base UI does not see a new callback ref on every render.
  const mergedRef = React.useMemo(() => mergeRefs(ref, triggerRef), [ref, triggerRef]);
  const renderElement: BaseContextMenu.Trigger.Props["render"] =
    asChild && React.isValidElement(children) ? children : render;
  return (
    <BaseContextMenu.Trigger
      ref={mergedRef}
      render={renderElement}
      {...(renderElement ? props : { ...props, children })}
    />
  );
};
ContextMenuTrigger.displayName = "ContextMenu.Trigger";

/** Portalled panel that holds the menu's items, positioned from the pointer. */
export const ContextMenuContent = ({
  className,
  alignOffset = 0,
  align = "start",
  sideOffset = 4,
  side = "bottom",
  style,
  ref,
  ...props
}: ContextMenuContentProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.Popup>> | undefined;
}) => {
  const direction = React.use(ContextMenuDirectionContext)?.direction;
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner
        dir={direction}
        style={{ zIndex: overlayZIndex.popover }}
        alignOffset={alignOffset}
        align={align}
        sideOffset={sideOffset}
        side={side}
      >
        <BaseContextMenu.Popup
          ref={ref}
          className={cn(
            overlayClassNames.menuSurface,
            overlayPrimitiveClassNames.menuSurface,
            "min-w-40 max-w-80",
            className,
          )}
          style={{
            zIndex: overlayZIndex.popover,
            maxHeight: "var(--context-menu-max-height, var(--available-height))",
            ...style,
          }}
          {...props}
        />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
};
ContextMenuContent.displayName = "ContextMenu.Content";

/** Groups related items so assistive tech announces them together. */
export const ContextMenuGroup = BaseContextMenu.Group;
ContextMenuGroup.displayName = "ContextMenu.Group";

/** Non-interactive heading that names the group of items below it. */
export const ContextMenuLabel = ({
  className,
  ref,
  ...props
}: ContextMenuLabelProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.GroupLabel>> | undefined;
}) => (
  <BaseContextMenu.GroupLabel
    ref={ref}
    className={cn("px-2 py-1 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
);
ContextMenuLabel.displayName = "ContextMenu.Label";

/** Hairline between groups of items. */
export const ContextMenuSeparator = ({
  className,
  ref,
  ...props
}: ContextMenuSeparatorProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.Separator>> | undefined;
}) => (
  <BaseContextMenu.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
);
ContextMenuSeparator.displayName = "ContextMenu.Separator";

/**
 * Selectable row. Renders as a link when `href` is set. Use `variant="destructive"` for
 * actions that delete or discard.
 */
export const ContextMenuItem = ({
  children,
  onSelect,
  disabled,
  href,
  target,
  rel,
  prefix,
  suffix,
  variant = "default",
  value,
  className,
  ref,
  ...props
}: ContextMenuItemProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.Item>> | undefined;
}) => {
  const inner = (
    <ContextMenuItemContent prefix={prefix} suffix={suffix}>
      {children}
    </ContextMenuItemContent>
  );

  if (href) {
    // `onSelect` is typed for the div row; the same handler is valid on the anchor row.
    const onLinkClick = onSelect as React.ComponentPropsWithoutRef<
      typeof BaseContextMenu.LinkItem
    >["onClick"];
    return (
      <BaseContextMenu.LinkItem
        ref={ref}
        // Base UI's link item has no `disabled`, so a disabled link drops its href (nothing to
        // navigate to), is announced as disabled and swallows the click.
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        data-value={value}
        data-variant={variant}
        aria-disabled={disabled ? true : undefined}
        data-disabled={disabled ? "" : undefined}
        onClick={disabled ? (event) => event.preventDefault() : onLinkClick}
        className={cn(overlayPrimitiveClassNames.contextMenuItem, className)}
        {...props}
      >
        {inner}
      </BaseContextMenu.LinkItem>
    );
  }

  return (
    <BaseContextMenu.Item
      ref={ref}
      data-value={value}
      data-variant={variant}
      disabled={disabled}
      onClick={onSelect}
      className={cn(overlayPrimitiveClassNames.contextMenuItem, className)}
      {...props}
    >
      {inner}
    </BaseContextMenu.Item>
  );
};
ContextMenuItem.displayName = "ContextMenu.Item";

/** Item that toggles a boolean setting and shows a check while `checked`. */
export const ContextMenuCheckboxItem = ({
  children,
  prefix,
  suffix,
  onSelect,
  value,
  className,
  checked,
  defaultChecked,
  ref,
  ...props
}: ContextMenuCheckboxItemProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.CheckboxItem>> | undefined;
}) => (
  <BaseContextMenu.CheckboxItem
    ref={ref}
    checked={checked}
    defaultChecked={defaultChecked}
    data-value={value}
    onClick={onSelect}
    className={cn(overlayPrimitiveClassNames.contextMenuItem, "ps-8", className)}
    {...props}
  >
    <BaseContextMenu.CheckboxItemIndicator className={overlayPrimitiveClassNames.menuIndicator}>
      <Check className="size-4" />
    </BaseContextMenu.CheckboxItemIndicator>
    <ContextMenuItemContent prefix={prefix} suffix={suffix}>
      {children}
    </ContextMenuItemContent>
  </BaseContextMenu.CheckboxItem>
);
ContextMenuCheckboxItem.displayName = "ContextMenu.CheckboxItem";

/** Holds the `value` shared by a set of `ContextMenuRadioItem`s. */
export const ContextMenuRadioGroup = ({
  onValueChange,
  ref,
  ...props
}: ContextMenuRadioGroupProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.RadioGroup>> | undefined;
}) => <BaseContextMenu.RadioGroup ref={ref} onValueChange={onValueChange} {...props} />;
ContextMenuRadioGroup.displayName = "ContextMenu.RadioGroup";

/** One choice in a `ContextMenuRadioGroup`, marked with a dot while selected. */
export const ContextMenuRadioItem = ({
  children,
  prefix,
  suffix,
  onSelect,
  className,
  value,
  ref,
  ...props
}: ContextMenuRadioItemProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.RadioItem>> | undefined;
}) => (
  <BaseContextMenu.RadioItem
    ref={ref}
    value={value}
    onClick={onSelect}
    className={cn(overlayPrimitiveClassNames.contextMenuItem, "ps-8", className)}
    {...props}
  >
    <BaseContextMenu.RadioItemIndicator className={overlayPrimitiveClassNames.menuIndicator}>
      <span className="size-2 rounded-full bg-current" />
    </BaseContextMenu.RadioItemIndicator>
    <ContextMenuItemContent prefix={prefix} suffix={suffix}>
      {children}
    </ContextMenuItemContent>
  </BaseContextMenu.RadioItem>
);
ContextMenuRadioItem.displayName = "ContextMenu.RadioItem";

/** Wraps a `ContextMenuSubTrigger` and its `ContextMenuSubContent` to form a nested submenu. */
export const ContextMenuSub = BaseContextMenu.SubmenuRoot;

/** Row that opens a nested submenu, with a trailing chevron unless `suffix` replaces it. */
export const ContextMenuSubTrigger = ({
  children,
  prefix,
  suffix,
  onSelect,
  className,
  ref,
  ...props
}: ContextMenuSubTriggerProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.SubmenuTrigger>> | undefined;
}) => (
  <BaseContextMenu.SubmenuTrigger
    ref={ref}
    onClick={onSelect}
    className={cn(overlayPrimitiveClassNames.contextMenuItem, className)}
    {...props}
  >
    <ContextMenuItemContent
      prefix={prefix}
      suffix={suffix ?? <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />}
    >
      {children}
    </ContextMenuItemContent>
  </BaseContextMenu.SubmenuTrigger>
);
ContextMenuSubTrigger.displayName = "ContextMenu.SubTrigger";

/**
 * Panel for a nested submenu. Takes the props of `ContextMenuContent`, but opens beside its
 * `ContextMenuSubTrigger` on the inline-end side (right in LTR, left in RTL) rather than below it.
 */
export const ContextMenuSubContent = ({
  side = "inline-end",
  sideOffset = 0,
  alignOffset = -4,
  ref,
  ...props
}: ContextMenuContentProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.Popup>> | undefined;
}) => (
  <ContextMenuContent
    ref={ref}
    side={side}
    sideOffset={sideOffset}
    alignOffset={alignOffset}
    {...props}
  />
);
ContextMenuSubContent.displayName = "ContextMenu.SubContent";

/** End-aligned shortcut hint for an item. Decorative: it does not bind the keys itself. */
export const ContextMenuShortcut = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & { ref?: React.Ref<HTMLSpanElement> | undefined }) => (
  <span
    ref={ref}
    className={cn("ms-auto text-xs tabular-nums text-muted-foreground", className)}
    {...props}
  />
);
ContextMenuShortcut.displayName = "ContextMenu.Shortcut";

/**
 * Context menu root with every part attached as a static, so `ContextMenu.Item` and
 * `ContextMenuItem` are the same component.
 */
export const ContextMenu = Object.assign(ContextMenuRoot, {
  /** Holds the open state of one context menu. */
  Root: ContextMenuRoot,
  /** Region that opens the menu on right click or long press. */
  Trigger: ContextMenuTrigger,
  /** Portalled panel that holds the menu's items. */
  Content: ContextMenuContent,
  /** Groups related items so assistive tech announces them together. */
  Group: ContextMenuGroup,
  /** Selectable row; renders as a link when `href` is set. */
  Item: ContextMenuItem,
  /** Item that toggles a boolean setting. */
  CheckboxItem: ContextMenuCheckboxItem,
  /** Holds the value shared by a set of radio items. */
  RadioGroup: ContextMenuRadioGroup,
  /** One choice in a radio group. */
  RadioItem: ContextMenuRadioItem,
  /** Non-interactive heading for a group of items. */
  Label: ContextMenuLabel,
  /** Hairline between groups of items. */
  Separator: ContextMenuSeparator,
  /** End-aligned shortcut hint for an item. */
  Shortcut: ContextMenuShortcut,
  /** Wraps a sub trigger and its content to form a nested submenu. */
  Sub: ContextMenuSub,
  /** Row that opens a nested submenu. */
  SubTrigger: ContextMenuSubTrigger,
  /** Panel for a nested submenu; opens on the inline-end side of its trigger. */
  SubContent: ContextMenuSubContent,
});

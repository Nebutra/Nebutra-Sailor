"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { Check, ChevronRight } from "@nebutra/icons";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

type ContextMenuItemVariant = "default" | "destructive";

export interface ContextMenuItemProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item>,
    "disabled" | "label" | "closeOnClick"
  > {
  children?: React.ReactNode;
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item>["onClick"];
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  variant?: ContextMenuItemVariant;
  value?: string;
  className?: string;
}

export interface ContextMenuCheckboxItemProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem>,
    "checked" | "defaultChecked" | "disabled" | "label" | "closeOnClick" | "onCheckedChange"
  > {
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem>["onClick"];
  value?: string;
  className?: string;
}

export interface ContextMenuRadioGroupProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioGroup>,
    "value" | "defaultValue" | "onValueChange"
  > {
  value?: string;
  defaultValue?: string;
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
  children?: React.ReactNode;
  value: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioItem>["onClick"];
  className?: string;
}

export interface ContextMenuSubTriggerProps
  extends Pick<
    React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger>,
    "disabled" | "label" | "delay" | "closeDelay" | "openOnHover"
  > {
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onSelect?: React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger>["onClick"];
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
        <span className="ml-auto flex shrink-0 items-center text-muted-foreground">{suffix}</span>
      )}
    </>
  );
}

export const ContextMenuRoot = BaseContextMenu.Root;

export const ContextMenuTrigger = ({
  asChild,
  children,
  render,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & { asChild?: boolean } & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.Trigger>> | undefined;
}) => {
  const renderElement: BaseContextMenu.Trigger.Props["render"] =
    asChild && React.isValidElement(children) ? children : render;
  return (
    <BaseContextMenu.Trigger
      ref={ref}
      render={renderElement}
      {...(renderElement ? props : { ...props, children })}
    />
  );
};
ContextMenuTrigger.displayName = "ContextMenu.Trigger";

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
}) => (
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
ContextMenuContent.displayName = "ContextMenu.Content";

export const ContextMenuGroup = BaseContextMenu.Group;
ContextMenuGroup.displayName = "ContextMenu.Group";

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
    return (
      <BaseContextMenu.LinkItem
        ref={ref}
        href={href}
        target={target}
        rel={rel}
        data-value={value}
        data-variant={variant}
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
    className={cn(overlayPrimitiveClassNames.contextMenuItem, "pl-8", className)}
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

export const ContextMenuRadioGroup = ({
  onValueChange,
  ref,
  ...props
}: ContextMenuRadioGroupProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseContextMenu.RadioGroup>> | undefined;
}) => <BaseContextMenu.RadioGroup ref={ref} onValueChange={onValueChange} {...props} />;
ContextMenuRadioGroup.displayName = "ContextMenu.RadioGroup";

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
    className={cn(overlayPrimitiveClassNames.contextMenuItem, "pl-8", className)}
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

export const ContextMenuSub = BaseContextMenu.SubmenuRoot;

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
    <ContextMenuItemContent prefix={prefix} suffix={suffix ?? <ChevronRight className="size-4" />}>
      {children}
    </ContextMenuItemContent>
  </BaseContextMenu.SubmenuTrigger>
);
ContextMenuSubTrigger.displayName = "ContextMenu.SubTrigger";

export const ContextMenuSubContent = ContextMenuContent;
ContextMenuSubContent.displayName = "ContextMenu.SubContent";

export const ContextMenuShortcut = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & { ref?: React.Ref<HTMLSpanElement> | undefined }) => (
  <span
    ref={ref}
    className={cn("ml-auto text-xs tabular-nums text-muted-foreground", className)}
    {...props}
  />
);
ContextMenuShortcut.displayName = "ContextMenu.Shortcut";

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Group: ContextMenuGroup,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: ContextMenuRadioGroup,
  RadioItem: ContextMenuRadioItem,
  Label: ContextMenuLabel,
  Separator: ContextMenuSeparator,
  Shortcut: ContextMenuShortcut,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
});

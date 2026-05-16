"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { Check, ChevronRight } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";

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

const contextMenuContentClassName = [
  "z-50 min-w-40 max-w-80 overflow-hidden rounded-[var(--radius-md)] border border-border bg-background/95 backdrop-blur-md",
  "p-1 text-popover-foreground shadow-lg outline-none",
  "transition-[opacity,transform] duration-flow ease-out",
  "data-[starting-style]:scale-95 data-[ending-style]:scale-95",
  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
].join(" ");

const contextMenuItemClassName = [
  "relative flex min-h-8 cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5",
  "text-sm outline-none transition-colors duration-micro ease-out",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-60",
  "data-[variant=destructive]:text-destructive data-[variant=destructive]:data-[highlighted]:bg-destructive/10 data-[variant=destructive]:data-[highlighted]:text-destructive",
].join(" ");

const contextMenuIndicatorClassName =
  "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center text-muted-foreground";

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

export const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Trigger>,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & { asChild?: boolean }
>(({ asChild, children, render, ...props }, ref) => {
  const renderElement: BaseContextMenu.Trigger.Props["render"] =
    asChild && React.isValidElement(children) ? children : render;
  return (
    <BaseContextMenu.Trigger
      ref={ref}
      render={renderElement}
      {...(renderElement ? props : { ...props, children })}
    />
  );
});
ContextMenuTrigger.displayName = "ContextMenu.Trigger";

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Popup>,
  ContextMenuContentProps
>(
  (
    {
      className,
      alignOffset = 0,
      align = "start",
      sideOffset = 4,
      side = "bottom",
      style,
      ...props
    },
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
          className={cn(contextMenuContentClassName, className)}
          style={{
            maxHeight: "var(--context-menu-max-height, var(--available-height))",
            ...style,
          }}
          {...props}
        />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  ),
);
ContextMenuContent.displayName = "ContextMenu.Content";

export const ContextMenuGroup = BaseContextMenu.Group;
ContextMenuGroup.displayName = "ContextMenu.Group";

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

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Separator>,
  ContextMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <BaseContextMenu.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = "ContextMenu.Separator";

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.Item>,
  ContextMenuItemProps
>(
  (
    {
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
      ...props
    },
    ref,
  ) => {
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
          className={cn(contextMenuItemClassName, className)}
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
        className={cn(contextMenuItemClassName, className)}
        {...props}
      >
        {inner}
      </BaseContextMenu.Item>
    );
  },
);
ContextMenuItem.displayName = "ContextMenu.Item";

export const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.CheckboxItem>,
  ContextMenuCheckboxItemProps
>(
  (
    { children, prefix, suffix, onSelect, value, className, checked, defaultChecked, ...props },
    ref,
  ) => (
    <BaseContextMenu.CheckboxItem
      ref={ref}
      checked={checked}
      defaultChecked={defaultChecked}
      data-value={value}
      onClick={onSelect}
      className={cn(contextMenuItemClassName, "pl-8", className)}
      {...props}
    >
      <BaseContextMenu.CheckboxItemIndicator className={contextMenuIndicatorClassName}>
        <Check className="size-4" />
      </BaseContextMenu.CheckboxItemIndicator>
      <ContextMenuItemContent prefix={prefix} suffix={suffix}>
        {children}
      </ContextMenuItemContent>
    </BaseContextMenu.CheckboxItem>
  ),
);
ContextMenuCheckboxItem.displayName = "ContextMenu.CheckboxItem";

export const ContextMenuRadioGroup = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.RadioGroup>,
  ContextMenuRadioGroupProps
>(({ onValueChange, ...props }, ref) => (
  <BaseContextMenu.RadioGroup ref={ref} onValueChange={onValueChange} {...props} />
));
ContextMenuRadioGroup.displayName = "ContextMenu.RadioGroup";

export const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.RadioItem>,
  ContextMenuRadioItemProps
>(({ children, prefix, suffix, onSelect, className, value, ...props }, ref) => (
  <BaseContextMenu.RadioItem
    ref={ref}
    value={value}
    onClick={onSelect}
    className={cn(contextMenuItemClassName, "pl-8", className)}
    {...props}
  >
    <BaseContextMenu.RadioItemIndicator className={contextMenuIndicatorClassName}>
      <span className="size-2 rounded-full bg-current" />
    </BaseContextMenu.RadioItemIndicator>
    <ContextMenuItemContent prefix={prefix} suffix={suffix}>
      {children}
    </ContextMenuItemContent>
  </BaseContextMenu.RadioItem>
));
ContextMenuRadioItem.displayName = "ContextMenu.RadioItem";

export const ContextMenuSub = BaseContextMenu.SubmenuRoot;

export const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof BaseContextMenu.SubmenuTrigger>,
  ContextMenuSubTriggerProps
>(({ children, prefix, suffix, onSelect, className, ...props }, ref) => (
  <BaseContextMenu.SubmenuTrigger
    ref={ref}
    onClick={onSelect}
    className={cn(contextMenuItemClassName, className)}
    {...props}
  >
    <ContextMenuItemContent prefix={prefix} suffix={suffix ?? <ChevronRight className="size-4" />}>
      {children}
    </ContextMenuItemContent>
  </BaseContextMenu.SubmenuTrigger>
));
ContextMenuSubTrigger.displayName = "ContextMenu.SubTrigger";

export const ContextMenuSubContent = ContextMenuContent;
ContextMenuSubContent.displayName = "ContextMenu.SubContent";

export const ContextMenuShortcut = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("ml-auto text-xs tabular-nums text-muted-foreground", className)}
    {...props}
  />
));
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

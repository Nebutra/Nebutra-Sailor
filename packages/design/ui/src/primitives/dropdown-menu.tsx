"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Check, ChevronRight, Status as Circle } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";

const DropdownMenu = BaseMenu.Root;

type DropdownMenuTriggerProps = React.ComponentProps<typeof BaseMenu.Trigger> & {
  asChild?: boolean;
};

const DropdownMenuTrigger = ({
  asChild,
  children,
  render,
  ref,
  ...props
}: DropdownMenuTriggerProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) => {
  const renderElement = asChild && React.isValidElement(children) ? children : render;
  return (
    <BaseMenu.Trigger
      ref={ref}
      render={renderElement as React.ComponentProps<typeof BaseMenu.Trigger>["render"]}
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
    className={cn(
      "flex cursor-default select-none items-center rounded-[var(--radius-md)] px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[popup-open]:bg-accent",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" />
  </BaseMenu.SubmenuTrigger>
);
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.Popup>> | undefined;
}) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner>
      <BaseMenu.Popup
        ref={ref}
        className={cn(
          "z-50 min-w-32 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md p-1 text-popover-foreground shadow-xl transition-[opacity,transform,display] duration-flow ease-out data-[starting-style]:zoom-out-95 data-[ending-style]:zoom-out-95 data-[starting-style]:fade-out-0 data-[ending-style]:fade-out-0",
          className,
        )}
        {...props}
      />
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
);
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  align?: React.ComponentProps<typeof BaseMenu.Positioner>["align"];
  sideOffset?: React.ComponentProps<typeof BaseMenu.Positioner>["sideOffset"];
  alignOffset?: React.ComponentProps<typeof BaseMenu.Positioner>["alignOffset"];
  side?: React.ComponentProps<typeof BaseMenu.Positioner>["side"];
}

const DropdownMenuContent = ({
  className,
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  ref,
  ...props
}: DropdownMenuContentProps & {
  ref?: React.Ref<React.ElementRef<typeof BaseMenu.Popup>> | undefined;
}) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      side={side}
    >
      <BaseMenu.Popup
        ref={ref}
        className={cn(
          "z-50 min-w-32 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md p-1 text-popover-foreground shadow-xl transition-[opacity,transform,display] duration-flow ease-out outline-none data-[starting-style]:zoom-out-95 data-[ending-style]:zoom-out-95 data-[starting-style]:fade-out-0 data-[ending-style]:fade-out-0",
          className,
        )}
        {...props}
      />
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = ({
  className,
  inset,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {
  inset?: boolean;
} & { ref?: React.Ref<React.ElementRef<typeof BaseMenu.Item>> | undefined }) => (
  <BaseMenu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
);
DropdownMenuItem.displayName = "DropdownMenuItem";

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
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...(checked !== undefined && { checked })}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
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
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <BaseMenu.RadioItemIndicator>
        <Circle className="size-2 fill-current" />
      </BaseMenu.RadioItemIndicator>
    </span>
    {children}
  </BaseMenu.RadioItem>
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = ({
  className,
  inset,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {
  inset?: boolean;
} & { ref?: React.Ref<React.ElementRef<typeof BaseMenu.GroupLabel>> | undefined }) => (
  <BaseMenu.GroupLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

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

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

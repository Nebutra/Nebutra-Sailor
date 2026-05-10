"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";

const DropdownMenu = BaseMenu.Root;

type DropdownMenuTriggerProps = React.ComponentProps<typeof BaseMenu.Trigger> & {
  asChild?: boolean;
};

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ asChild, children, render, ...props }, ref) => {
    const renderElement = asChild && React.isValidElement(children) ? children : render;
    return (
      <BaseMenu.Trigger
        ref={ref}
        render={renderElement as React.ComponentProps<typeof BaseMenu.Trigger>["render"]}
        {...(renderElement ? props : { ...props, children })}
      />
    );
  },
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuGroup = BaseMenu.Group;

const DropdownMenuPortal = BaseMenu.Portal;

const DropdownMenuSub = BaseMenu.SubmenuRoot;

const DropdownMenuRadioGroup = BaseMenu.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof BaseMenu.SubmenuTrigger>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <BaseMenu.SubmenuTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-[var(--radius-md)] px-2 py-1.5 text-sm outline-none focus:bg-accent data-[popup-open]:bg-accent",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </BaseMenu.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof BaseMenu.Popup>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Popup>
>(({ className, ...props }, ref) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner>
      <BaseMenu.Popup
        ref={ref}
        className={cn(
          "z-50 min-w-32 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md p-1 text-popover-foreground shadow-xl transition-all data-[starting-style]:zoom-out-95 data-[ending-style]:zoom-out-95 data-[starting-style]:fade-out-0 data-[ending-style]:fade-out-0",
          className,
        )}
        {...props}
      />
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  align?: React.ComponentProps<typeof BaseMenu.Positioner>["align"];
  sideOffset?: React.ComponentProps<typeof BaseMenu.Positioner>["sideOffset"];
  alignOffset?: React.ComponentProps<typeof BaseMenu.Positioner>["alignOffset"];
  side?: React.ComponentProps<typeof BaseMenu.Positioner>["side"];
}

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof BaseMenu.Popup>,
  DropdownMenuContentProps
>(
  (
    { className, sideOffset = 4, align = "center", alignOffset = 0, side = "bottom", ...props },
    ref,
  ) => (
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
            "z-50 min-w-32 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md p-1 text-popover-foreground shadow-xl transition-all outline-none data-[starting-style]:zoom-out-95 data-[ending-style]:zoom-out-95 data-[starting-style]:fade-out-0 data-[ending-style]:fade-out-0",
            className,
          )}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof BaseMenu.Item>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <BaseMenu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof BaseMenu.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <BaseMenu.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...(checked !== undefined && { checked })}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseMenu.CheckboxItemIndicator>
        <Check className="h-4 w-4" />
      </BaseMenu.CheckboxItemIndicator>
    </span>
    {children}
  </BaseMenu.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof BaseMenu.RadioItem>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem>
>(({ className, children, ...props }, ref) => (
  <BaseMenu.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-md)] py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseMenu.RadioItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </BaseMenu.RadioItemIndicator>
    </span>
    {children}
  </BaseMenu.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof BaseMenu.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <BaseMenu.GroupLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof BaseMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <BaseMenu.Separator
    ref={ref}
    orientation={orientation}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
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

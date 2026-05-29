"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Check, ChevronRight, Status as Circle } from "@nebutra/icons";
import * as React from "react";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { overlayPrimitiveClassNames } from "./overlay";

type DropdownMenuContextValue = {
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

type DropdownMenuProps = React.ComponentPropsWithoutRef<typeof BaseMenu.Root>;

function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(
    nextOpen: boolean,
    eventDetails?: Parameters<NonNullable<DropdownMenuProps["onOpenChange"]>>[1],
  ) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen, eventDetails as never);
  }

  const contextValue: DropdownMenuContextValue = { setOpen };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <BaseMenu.Root open={open} onOpenChange={setOpen} {...props}>
        {children}
      </BaseMenu.Root>
    </DropdownMenuContext.Provider>
  );
}
DropdownMenu.displayName = "DropdownMenu";

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
  const context = React.use(DropdownMenuContext);
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
    className={cn(overlayPrimitiveClassNames.menuSubTrigger, inset && "pl-8", className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" />
  </BaseMenu.SubmenuTrigger>
);
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = ({
  className,
  style,
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
  style,
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
    className={cn(overlayPrimitiveClassNames.menuItem, inset && "pl-8", className)}
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
    className={cn(overlayPrimitiveClassNames.menuCheckboxItem, className)}
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
    className={cn(overlayPrimitiveClassNames.menuCheckboxItem, className)}
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
}: React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean;
} & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
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

"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { cn } from "../utils/cn";

// Base UI Popover currently lacks a native "hover to open" feature built-in,
// so we simulate it with simple controlled state around the BasePopover.
const HoverCard = ({
  openDelay = 200,
  closeDelay = 150,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof BasePopover.Root> & {
  openDelay?: number;
  closeDelay?: number;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>(null);

  const handleMouseEnter = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), openDelay);
  }, [openDelay]);

  const handleMouseLeave = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover state wrapper — interactive trigger lives inside HoverCardTrigger
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block relative"
    >
      <BasePopover.Root
        open={open}
        onOpenChange={(v) => {
          if (!v) setOpen(false); // Only allow closing via clicks outside
        }}
        {...props}
      >
        {children}
      </BasePopover.Root>
    </div>
  );
};

const HoverCardTrigger: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof BasePopover.Trigger> & {
    asChild?: boolean;
  } & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Trigger> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BasePopover.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BasePopover.Trigger ref={ref} {...props}>
      {children}
    </BasePopover.Trigger>
  );
});
HoverCardTrigger.displayName = "HoverCardTrigger";

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof BasePopover.Popup>,
  React.ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
    align?: "start" | "center" | "end";
    sideOffset?: number;
    side?: "top" | "right" | "bottom" | "left";
  }
>(({ className, align = "center", sideOffset = 4, side = "bottom", ...props }, ref) => (
  <BasePopover.Portal>
    <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset}>
      <BasePopover.Popup
        ref={ref}
        className={cn(
          "z-50 w-64 rounded-xl border border-border bg-background/90 backdrop-blur-md p-4 text-popover-foreground shadow-xl outline-none transition-[opacity,transform,display] duration-200 data-starting-style:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-starting-style:fade-in-0 data-ending-style:zoom-out-95 data-starting-style:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </BasePopover.Positioner>
  </BasePopover.Portal>
));
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardContent, HoverCardTrigger };

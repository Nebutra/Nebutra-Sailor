"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "../utils/cn";

// We expose Base UI's native Provider to pass global `delayDuration` downwards to tooltips.
const TooltipProvider = ({
  children,
  delayDuration,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) => {
  const providerProps = delayDuration !== undefined ? { delay: delayDuration } : {};
  return <BaseTooltip.Provider {...providerProps}>{children}</BaseTooltip.Provider>;
};

const Tooltip = ({
  delayDuration,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Root> & {
  delayDuration?: number;
  children?: React.ReactNode;
}) => {
  if (delayDuration !== undefined) {
    return (
      <BaseTooltip.Provider delay={delayDuration}>
        <BaseTooltip.Root {...props}>{children}</BaseTooltip.Root>
      </BaseTooltip.Provider>
    );
  }
  return <BaseTooltip.Root {...props}>{children}</BaseTooltip.Root>;
};

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseTooltip.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseTooltip.Trigger ref={ref} {...props}>
      {children}
    </BaseTooltip.Trigger>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof BaseTooltip.Popup>,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    alignOffset?: number;
  }
>(
  (
    { className, side = "top", align = "center", sideOffset = 4, alignOffset = 0, ...props },
    ref,
  ) => (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50"
      >
        <BaseTooltip.Popup
          ref={ref}
          className={cn(
            "z-50 overflow-hidden rounded-xl border bg-background/90 backdrop-blur-md px-3 py-1.5 text-sm text-popover-foreground shadow-xl transition-[opacity,transform,display] duration-200 data-starting-style:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95 data-ending-style:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  ),
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

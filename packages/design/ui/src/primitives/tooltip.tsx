"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  Tooltip — Base UI tooltip wrapper, used across the design system.
 *
 *  Geist behavior contract (verified in this wrapper, document at top so
 *  drift gets called out at code review):
 *    - Opens on hover AND keyboard focus (Base UI default — don't override).
 *    - Default entry delay ≈ 150ms so the tooltip doesn't flicker on a
 *      sweeping mouse. Provider-level default set below; caller can override.
 *    - Escape closes the tooltip and returns focus to the trigger (Base UI).
 *
 *  Content rules (Geist):
 *    - Explains *why* something exists, not *what* it is. The visible label
 *      names the thing; the tooltip adds the constraint, scope, or limit.
 *    - One sentence or fragment, sentence case, no terminal period for a
 *      single fragment.
 *    - Don't repeat the visible label (`text="Rate Limit"` on a Rate Limit
 *      button) and don't describe the interaction (`"Click to override"`).
 *    - Lifecycle tooltips: `{Label}: {one-line meaning}. {Specific limit}.`
 *
 *  Don'ts (caller responsibility):
 *    - Don't wrap a labelled Input in a Tooltip — the trigger lands on the
 *      <label>, not the field, and the body becomes a phantom second label.
 *      Put help on a sibling icon button instead.
 *    - Keep primary actions outside the Tooltip; touch users can't reach a
 *      hover-revealed control.
 *    - Icon-only triggers MUST carry their own `aria-label` naming the
 *      action — the tooltip body adds context, it doesn't replace the label.
\* -------------------------------------------------------------------------- */

// Geist-standard delay; matches the platform Best Practices.
const DEFAULT_TOOLTIP_DELAY_MS = 150;

// We expose Base UI's native Provider to pass global `delayDuration` downwards.
// Default landed at 150ms so isolated `<Tooltip>` usage matches Geist out of
// the box — explicit callers can still override per provider scope.
const TooltipProvider = ({
  children,
  delayDuration = DEFAULT_TOOLTIP_DELAY_MS,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) => {
  return <BaseTooltip.Provider delay={delayDuration}>{children}</BaseTooltip.Provider>;
};

const Tooltip = ({
  delayDuration,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Root> & {
  delayDuration?: number;
  children?: React.ReactNode;
}) => {
  // Standalone `<Tooltip>` (no enclosing Provider) gets the Geist default;
  // any explicit `delayDuration` wins.
  const delay = delayDuration ?? DEFAULT_TOOLTIP_DELAY_MS;
  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root {...props}>{children}</BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
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

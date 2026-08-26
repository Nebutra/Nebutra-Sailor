"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  Tooltip — Base UI tooltip wrapper, used across the design system.
 *
 *  Geist behavior contract (verified in this wrapper, document at top so
 *  drift gets called out at code review):
 *    - Opens on hover AND keyboard focus (Base UI default — don't override).
 *    - Default entry delay ≈ 150ms so the tooltip doesn't flicker on a
 *      sweeping mouse. Subsequent tooltips in a group skip delay + duration.
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

const DEFAULT_TOOLTIP_DELAY_MS = 150;
const SKIP_DELAY_WINDOW_MS = 400;

let lastTooltipOpenAt = 0;
const skipDelayListeners = new Set<() => void>();

function markTooltipOpened() {
  lastTooltipOpenAt = Date.now();
  for (const listener of skipDelayListeners) listener();
}

function shouldSkipDelay() {
  return Date.now() - lastTooltipOpenAt < SKIP_DELAY_WINDOW_MS;
}

function useSkipDelay() {
  const [, tick] = React.useReducer((count: number) => count + 1, 0);

  React.useEffect(() => {
    skipDelayListeners.add(tick);
    return () => {
      skipDelayListeners.delete(tick);
    };
  }, []);

  return shouldSkipDelay();
}

const TooltipInstantContext = React.createContext(false);

const TooltipProvider = ({
  children,
  delayDuration = DEFAULT_TOOLTIP_DELAY_MS,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) => {
  const skipDelay = useSkipDelay();
  return (
    <BaseTooltip.Provider delay={skipDelay ? 0 : delayDuration}>{children}</BaseTooltip.Provider>
  );
};

const Tooltip = ({
  delayDuration,
  children,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Root> & {
  delayDuration?: number;
  children?: React.ReactNode;
}) => {
  const skipDelay = useSkipDelay();
  const instant = delayDuration == null && skipDelay;
  const delay = delayDuration ?? (instant ? 0 : DEFAULT_TOOLTIP_DELAY_MS);

  return (
    <TooltipInstantContext.Provider value={instant}>
      <BaseTooltip.Provider delay={delay}>
        <BaseTooltip.Root
          {...props}
          onOpenChange={(open, eventDetails) => {
            if (open) markTooltipOpened();
            onOpenChange?.(open, eventDetails);
          }}
        >
          {children}
        </BaseTooltip.Root>
      </BaseTooltip.Provider>
    </TooltipInstantContext.Provider>
  );
};

const TooltipTrigger = ({
  asChild,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> & { asChild?: boolean } & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
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
};
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = ({
  className,
  style,
  side = "top",
  align = "center",
  sideOffset = 4,
  alignOffset = 0,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
} & { ref?: React.Ref<React.ElementRef<typeof BaseTooltip.Popup>> | undefined }) => {
  const instant = React.use(TooltipInstantContext);

  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        style={{ zIndex: overlayZIndex.tooltip }}
      >
        <BaseTooltip.Popup
          ref={ref}
          className={cn(overlayClassNames.tooltipSurface, className)}
          data-instant={instant || undefined}
          style={{ zIndex: overlayZIndex.tooltip, ...style }}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
};
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

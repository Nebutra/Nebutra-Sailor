"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { usePortalContainer } from "@nebutra/ui/utils/portal-container";
import * as React from "react";
import { interaction } from "../tokens/components/interaction";
import { overlayClassNames, overlayZIndex } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import {
  BaseDirectionScope,
  mergeRefs,
  type TextDirection,
  useTriggerDirection,
} from "../utils/direction";
import { resolveLazyChild } from "../utils/lazy-child";

/* -------------------------------------------------------------------------- *\
 *  Tooltip — Base UI tooltip wrapper, used across the design system.
 *
 *  Geist behavior contract (verified in this wrapper, document at top so
 *  drift gets called out at code review):
 *    - Opens on hover AND keyboard focus (Base UI default — don't override).
 *    - The first tooltip waits interaction.tooltip.delayMs (700, Radix's
 *      default) so a sweeping pointer doesn't strobe; a neighbour reached
 *      within skipWindowMs (300) opens instantly. 150ms read as flicker.
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

// From the interaction contract: first tooltip waits, neighbours open at once.
const DEFAULT_TOOLTIP_DELAY_MS = interaction.tooltip.delayMs;
const SKIP_DELAY_WINDOW_MS = interaction.tooltip.skipWindowMs;

let lastTooltipOpenAt = 0;
const skipDelayListeners = new Set<() => void>();

function markTooltipOpened() {
  lastTooltipOpenAt = Date.now();
  for (const listener of skipDelayListeners) listener();
}

/**
 * Whether a tooltip opened within the skip window. The clock is read only in
 * effects, never while rendering: a render-time Date.now() makes Next's
 * prerender (cacheComponents) give up on the nearest Suspense boundary and
 * ship it client-rendered. Through SidebarNav's TooltipProvider that was every
 * page of a rail-framed site — the server HTML carried only "Loading…".
 */
function useSkipDelay() {
  const [skip, setSkip] = React.useState(false);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      const left = SKIP_DELAY_WINDOW_MS - (Date.now() - lastTooltipOpenAt);
      setSkip(left > 0);
      clearTimeout(timer);
      if (left > 0) timer = setTimeout(() => setSkip(false), left);
    };
    sync();
    skipDelayListeners.add(sync);
    return () => {
      skipDelayListeners.delete(sync);
      clearTimeout(timer);
    };
  }, []);

  return skip;
}

const TooltipInstantContext = React.createContext(false);

type TooltipDirectionValue = {
  /** Ref callback for the trigger the reading direction is measured from. */
  triggerRef: React.RefCallback<Element>;
  /** Reading direction applied to the popup and handed to Base UI for `inline-*` sides. */
  direction: TextDirection;
};

// Undefined outside a Tooltip so a stray TooltipContent never forces `dir` onto the page.
const TooltipDirectionContext = React.createContext<TooltipDirectionValue | undefined>(undefined);

/** Provides Base UI tooltip timing with a shared skip window after a tooltip opens. */
const TooltipProvider = ({
  children,
  delayDuration = DEFAULT_TOOLTIP_DELAY_MS,
}: {
  /** Tooltip triggers and content that share this provider's timing context. */
  children: React.ReactNode;
  /** Initial hover delay in milliseconds; recent tooltip activity temporarily skips it. */
  delayDuration?: number;
}) => {
  const skipDelay = useSkipDelay();
  return (
    <BaseTooltip.Provider delay={skipDelay ? 0 : delayDuration}>{children}</BaseTooltip.Provider>
  );
};

/**
 * Shows contextual help on hover or keyboard focus, with a delay skipped after recent tooltips.
 * The portalled tooltip takes the reading direction of its trigger, so under `dir="rtl"` the
 * `inline-start` / `inline-end` sides, `align`, and the text inside it all mirror.
 */
const Tooltip = ({
  delayDuration,
  children,
  onOpenChange,
  dir: dirProp,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Root> & {
  /** Hover delay in milliseconds; an explicit value overrides the recent-open skip behavior. */
  delayDuration?: number;
  /** TooltipTrigger and TooltipContent elements belonging to this tooltip. */
  children?: React.ReactNode;
  /**
   * Reading direction of the tooltip. Leave it out to follow the `dir` in effect around the
   * trigger (an ancestor `dir` attribute, else CSS `direction`); set it when the tooltip has no
   * trigger to measure from.
   * @default "the direction around the trigger"
   */
  dir?: TextDirection;
}) => {
  const skipDelay = useSkipDelay();
  const instant = delayDuration == null && skipDelay;
  const delay = delayDuration ?? (instant ? 0 : DEFAULT_TOOLTIP_DELAY_MS);
  const { triggerRef, direction } = useTriggerDirection(dirProp);
  const directionValue = React.useMemo(() => ({ triggerRef, direction }), [triggerRef, direction]);

  return (
    <TooltipInstantContext.Provider value={instant}>
      <BaseTooltip.Provider delay={delay}>
        <TooltipDirectionContext.Provider value={directionValue}>
          <BaseDirectionScope direction={direction}>
            <BaseTooltip.Root
              {...props}
              onOpenChange={(open, eventDetails) => {
                if (open) markTooltipOpened();
                onOpenChange?.(open, eventDetails);
              }}
            >
              {children}
            </BaseTooltip.Root>
          </BaseDirectionScope>
        </TooltipDirectionContext.Provider>
      </BaseTooltip.Provider>
    </TooltipInstantContext.Provider>
  );
};

/** Opens the tooltip on hover or keyboard focus, optionally reusing its child as the trigger. */
const TooltipTrigger = ({
  asChild,
  children: rawChildren,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> & {
  /** Uses a single valid child element as the trigger instead of creating a button. */
  asChild?: boolean;
} & {
  ref?: React.Ref<HTMLButtonElement> | undefined;
}) => {
  const children = resolveLazyChild(rawChildren);
  const directionTriggerRef = React.use(TooltipDirectionContext)?.triggerRef;
  // Memoised: a fresh callback ref every render would detach and re-register the trigger in Base UI.
  const mergedRef = React.useMemo(
    () => mergeRefs<HTMLButtonElement>(ref, directionTriggerRef),
    [ref, directionTriggerRef],
  );
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseTooltip.Trigger
        ref={mergedRef}
        {...props}
        render={children as React.ReactElement<Record<string, unknown>>}
      />
    );
  }
  return (
    <BaseTooltip.Trigger ref={mergedRef} {...props}>
      {children}
    </BaseTooltip.Trigger>
  );
};
TooltipTrigger.displayName = "TooltipTrigger";

/**
 * Renders tooltip text in a portal positioned relative to TooltipTrigger. Prefer `inline-start`
 * and `inline-end` over `left` and `right`: they mirror under `dir="rtl"`.
 */
const TooltipContent = ({
  className,
  style,
  side = "top",
  align = "center",
  sideOffset = 4,
  alignOffset = 0,
  container,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {
  /**
   * Preferred side of the trigger; collision handling may choose another side. `inline-start` and
   * `inline-end` mirror under `dir="rtl"`, while `left` and `right` stay physical.
   */
  side?: "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end";
  /** Alignment of the popup along the trigger's side. */
  align?: "start" | "center" | "end";
  /** Distance in pixels between the trigger and tooltip. */
  sideOffset?: number;
  /** Offset in pixels along the alignment axis. */
  alignOffset?: number;
  /** Portal target; defaults to the nearest portal scope or document.body. */
  container?: React.ComponentProps<typeof BaseTooltip.Portal>["container"];
} & { ref?: React.Ref<React.ElementRef<typeof BaseTooltip.Popup>> | undefined }) => {
  const instant = React.use(TooltipInstantContext);
  const direction = React.use(TooltipDirectionContext)?.direction;
  const portalContainer = usePortalContainer(container);

  return (
    <BaseTooltip.Portal container={portalContainer}>
      <BaseTooltip.Positioner
        dir={direction}
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
